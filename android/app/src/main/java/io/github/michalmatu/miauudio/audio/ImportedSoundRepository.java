package io.github.michalmatu.miauudio.audio;

import android.content.ContentResolver;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.provider.OpenableColumns;
import androidx.annotation.Nullable;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class ImportedSoundRepository {
    static final long MAX_IMPORT_BYTES = 200L * 1024L * 1024L;

    private static final String DIRECTORY = "user-sounds";
    private static final String PREFS = "miauudio-imported-sounds";
    private static final String MANIFEST = "manifest-v1";
    private static final String DELETE_MARKER = ".delete-";
    private static final String PART_MARKER = ".part";
    private static final Pattern UUID_VALUE = Pattern.compile(
        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern IMPORTED_FILE_ID = Pattern.compile(
        "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\\.(?:mp3|m4a|aac|wav|ogg|opus|flac))?$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern USER_SOUND_ID = Pattern.compile(
        "^user-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        Pattern.CASE_INSENSITIVE
    );

    private final Context context;
    private final File directory;
    private final SharedPreferences preferences;

    ImportedSoundRepository(Context context) {
        this.context = context.getApplicationContext();
        this.directory = new File(this.context.getFilesDir(), DIRECTORY);
        this.preferences = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    synchronized List<AudioModels.ImportedSound> list() {
        List<AudioModels.ImportedSound> sounds = loadManifest();
        List<AudioModels.ImportedSound> existing = new ArrayList<>(sounds.size());
        List<AudioModels.ImportedSound> retained = new ArrayList<>(sounds.size());
        boolean changed = false;
        for (AudioModels.ImportedSound sound : sounds) {
            if (fileFor(sound.fileId).isFile()) {
                existing.add(sound);
                retained.add(sound);
            } else if (hasDeleteTombstone(directory, sound.fileId)) {
                // Recovery may fail transiently. Keep the metadata while the tombstone is the
                // only private copy, but do not expose an unresolvable sound to the caller.
                retained.add(sound);
            } else {
                changed = true;
            }
        }
        if (changed) saveManifest(retained);
        return Collections.unmodifiableList(existing);
    }

    synchronized @Nullable AudioModels.ImportedSound findByFileId(String fileId) {
        if (!isSafeFileId(fileId)) return null;
        for (AudioModels.ImportedSound sound : loadManifest()) {
            if (sound.fileId.equals(fileId) && fileFor(fileId).isFile()) return sound;
        }
        return null;
    }

    synchronized @Nullable File resolveFile(String fileId) {
        AudioModels.ImportedSound sound = findByFileId(fileId);
        return sound == null ? null : fileFor(sound.fileId);
    }

    synchronized AudioModels.ImportedSound importFrom(Uri uri) throws IOException {
        ensureDirectory();
        ContentResolver resolver = context.getContentResolver();
        SourceMetadata source = readSourceMetadata(resolver, uri);
        if (source.sizeBytes > MAX_IMPORT_BYTES) {
            throw new IOException("The selected file is larger than 200 MB");
        }

        String extension = safeExtension(source.originalName, source.mimeType);
        String fileId = UUID.randomUUID().toString() + extension;
        File temporary = new File(directory, "." + fileId + ".part" + extension);
        File destination = fileFor(fileId);
        long copied;

        try (InputStream input = resolver.openInputStream(uri)) {
            if (input == null) throw new IOException("The selected file could not be opened");
            try (FileOutputStream output = new FileOutputStream(temporary)) {
                copied = copyWithLimit(input, output, MAX_IMPORT_BYTES);
                output.getFD().sync();
            }

            if (copied == 0) throw new IOException("The selected file is empty");
            long durationMs = validateAudio(temporary);
            if (!temporary.renameTo(destination)) throw new IOException("Could not store the imported sound");

            String id = "user-" + UUID.randomUUID();
            AudioModels.ImportedSound sound = new AudioModels.ImportedSound(
                id,
                fileId,
                sanitizeLabel(stripExtension(source.originalName)),
                source.originalName,
                source.mimeType,
                copied,
                durationMs,
                System.currentTimeMillis()
            );

            List<AudioModels.ImportedSound> sounds = new ArrayList<>(loadManifest());
            sounds.add(sound);
            if (!saveManifest(sounds)) {
                // Do not leave an unreferenced private copy behind if metadata cannot be committed.
                destination.delete();
                throw new IOException("Could not save imported sound metadata");
            }
            return sound;
        } finally {
            temporary.delete();
        }
    }

    synchronized AudioModels.ImportedSound rename(String id, String label) throws IOException {
        String normalized = sanitizeLabel(label);
        List<AudioModels.ImportedSound> sounds = new ArrayList<>(loadManifest());
        for (int index = 0; index < sounds.size(); index++) {
            AudioModels.ImportedSound current = sounds.get(index);
            if (!current.id.equals(id)) continue;
            AudioModels.ImportedSound renamed = new AudioModels.ImportedSound(
                current.id,
                current.fileId,
                normalized,
                current.originalName,
                current.mimeType,
                current.sizeBytes,
                current.durationMs,
                current.importedAt
            );
            sounds.set(index, renamed);
            if (!saveManifest(sounds)) throw new IOException("Could not rename the imported sound");
            return renamed;
        }
        throw new IOException("Imported sound not found");
    }

    synchronized @Nullable AudioModels.ImportedSound delete(String id) throws IOException {
        List<AudioModels.ImportedSound> sounds = new ArrayList<>(loadManifest());
        for (int index = 0; index < sounds.size(); index++) {
            AudioModels.ImportedSound removed = sounds.get(index);
            if (!removed.id.equals(id)) continue;

            File file = fileFor(removed.fileId);
            File tombstone = new File(directory, "." + removed.fileId + ".delete-" + UUID.randomUUID());
            boolean staged = false;
            if (file.exists()) {
                if (!file.isFile() || !file.renameTo(tombstone)) {
                    throw new IOException("Could not stage the imported sound for deletion");
                }
                staged = true;
            }

            sounds.remove(index);
            if (!saveManifest(sounds)) {
                sounds.add(index, removed);
                boolean metadataRestored = saveManifest(sounds);
                boolean fileRestored = !staged || tombstone.renameTo(file);
                if (!metadataRestored || !fileRestored) {
                    throw new IOException("Could not roll back the failed sound deletion");
                }
                throw new IOException("Could not update imported sound metadata");
            }

            // The manifest is now authoritative. A failed best-effort cleanup
            // leaves only a hidden tombstone, which a later repository access
            // will try to remove again.
            if (staged) tombstone.delete();
            return removed;
        }
        return null;
    }

    static long copyWithLimit(InputStream input, OutputStream output, long limit) throws IOException {
        if (limit < 0) throw new IllegalArgumentException("limit must not be negative");

        long copied = 0;
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = input.read(buffer)) != -1) {
            if (read == 0) continue;
            if (copied > limit - read) throw new IOException("The selected file is larger than 200 MB");
            output.write(buffer, 0, read);
            copied += read;
        }
        return copied;
    }

    static String sanitizeLabel(String label) throws IOException {
        String normalized = label == null ? "" : label.replaceAll("[\\p{Cntrl}]", " ").trim().replaceAll("\\s+", " ");
        if (normalized.isEmpty()) throw new IOException("Sound name must not be empty");
        if (normalized.length() > 80) normalized = normalized.substring(0, 80).trim();
        return normalized;
    }

    private long validateAudio(File file) throws IOException {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(file.getAbsolutePath());
            String duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            String hasAudio = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO);
            long durationMs = duration == null ? 0 : Long.parseLong(duration);
            if (durationMs <= 0 || (hasAudio != null && !"yes".equalsIgnoreCase(hasAudio))) {
                throw new IOException("The selected file does not contain supported audio");
            }
            return durationMs;
        } catch (RuntimeException error) {
            throw new IOException("The selected audio format is not supported", error);
        } finally {
            retriever.release();
        }
    }

    private SourceMetadata readSourceMetadata(ContentResolver resolver, Uri uri) {
        String originalName = "Imported sound";
        long sizeBytes = -1;
        try (Cursor cursor = resolver.query(uri, new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameIndex >= 0 && !cursor.isNull(nameIndex)) originalName = cursor.getString(nameIndex);
                if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) sizeBytes = cursor.getLong(sizeIndex);
            }
        }
        originalName = sanitizeProviderFilename(originalName);
        String mimeType = resolver.getType(uri);
        if (mimeType == null || mimeType.isBlank()) mimeType = "application/octet-stream";
        return new SourceMetadata(originalName, mimeType, sizeBytes);
    }

    private List<AudioModels.ImportedSound> loadManifest() {
        List<AudioModels.ImportedSound> sounds = parseManifest(preferences.getString(MANIFEST, "[]"));
        if (directory.isDirectory()) recoverTemporaryFiles(directory, sounds);
        return sounds;
    }

    static List<AudioModels.ImportedSound> parseManifest(@Nullable String raw) {
        List<AudioModels.ImportedSound> result = new ArrayList<>();
        try {
            JSONArray json = new JSONArray(raw == null ? "[]" : raw);
            for (int index = 0; index < json.length(); index++) {
                try {
                    AudioModels.ImportedSound sound = AudioModels.ImportedSound.fromJson(json.getJSONObject(index));
                    if (isSafeSoundId(sound.id) && isSafeFileId(sound.fileId)) result.add(sound);
                } catch (JSONException ignored) {
                    // A malformed entry must not make the remaining imported sounds inaccessible.
                }
            }
        } catch (JSONException ignored) {
            // Treat a corrupt manifest as empty. Files remain private and can be cleaned later.
        }
        return result;
    }

    private boolean saveManifest(List<AudioModels.ImportedSound> sounds) {
        JSONArray json = new JSONArray();
        try {
            for (AudioModels.ImportedSound sound : sounds) json.put(sound.toJson());
        } catch (JSONException error) {
            return false;
        }
        return preferences.edit().putString(MANIFEST, json.toString()).commit();
    }

    private void ensureDirectory() throws IOException {
        if ((!directory.exists() && !directory.mkdirs()) || !directory.isDirectory()) {
            throw new IOException("Could not create private sound storage");
        }
        loadManifest();
    }

    static void recoverTemporaryFiles(File directory, List<AudioModels.ImportedSound> sounds) {
        Set<String> referencedFileIds = new HashSet<>();
        for (AudioModels.ImportedSound sound : sounds) referencedFileIds.add(sound.fileId);

        File[] files = directory.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (!file.isFile()) continue;

            String name = file.getName();
            if (isTemporaryImportFileName(name)) {
                file.delete();
                continue;
            }

            String fileId = tombstoneFileId(name);
            if (fileId == null) continue;

            if (!referencedFileIds.contains(fileId)) {
                // The manifest commit completed, so this is only deferred physical cleanup.
                file.delete();
                continue;
            }

            File destination = new File(directory, fileId);
            if (!destination.exists()) {
                // A crash happened after staging the file but before committing its removal.
                // renameTo never overwrites here, so a failed or ambiguous recovery keeps the
                // tombstone as the only private copy for a later attempt.
                file.renameTo(destination);
            }
        }
    }

    private static @Nullable String tombstoneFileId(String name) {
        if (!name.startsWith(".")) return null;

        int marker = name.lastIndexOf(DELETE_MARKER);
        if (marker <= 1) return null;

        String fileId = name.substring(1, marker);
        String operationId = name.substring(marker + DELETE_MARKER.length());
        if (!isSafeFileId(fileId) || !UUID_VALUE.matcher(operationId).matches()) return null;
        return fileId;
    }

    private static boolean hasDeleteTombstone(File directory, String fileId) {
        File[] files = directory.listFiles();
        if (files == null) return false;

        for (File file : files) {
            if (file.isFile() && fileId.equals(tombstoneFileId(file.getName()))) return true;
        }
        return false;
    }

    private static boolean isTemporaryImportFileName(String name) {
        if (!name.startsWith(".")) return false;

        int marker = name.lastIndexOf(PART_MARKER);
        if (marker <= 1) return false;

        String fileId = name.substring(1, marker);
        if (!IMPORTED_FILE_ID.matcher(fileId).matches()) return false;

        int extensionStart = fileId.indexOf('.', 36);
        String extension = extensionStart < 0 ? "" : fileId.substring(extensionStart);
        return name.substring(marker + PART_MARKER.length()).equalsIgnoreCase(extension);
    }

    private File fileFor(String fileId) {
        return new File(directory, fileId);
    }

    static boolean isSafeFileId(String fileId) {
        return fileId != null && !fileId.isBlank() && !fileId.contains("/") && !fileId.contains("\\") && !fileId.contains("..");
    }

    static boolean isSafeSoundId(String id) {
        return id != null && USER_SOUND_ID.matcher(id).matches();
    }

    static String stripExtension(String name) {
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    static String sanitizeProviderFilename(@Nullable String name) {
        if (name == null || name.isBlank()) return "Imported sound";

        String normalized = name.replace('\\', '/');
        int separator = normalized.lastIndexOf('/');
        if (separator >= 0) normalized = normalized.substring(separator + 1);
        normalized = normalized.replaceAll("[\\p{Cntrl}]", " ").trim();

        if (normalized.length() > 255) normalized = normalized.substring(0, 255).trim();

        return normalized.isEmpty() ? "Imported sound" : normalized;
    }

    static String safeExtension(String name, String mimeType) {
        String candidate = "";
        int dot = name.lastIndexOf('.');
        if (dot >= 0 && dot < name.length() - 1) candidate = name.substring(dot + 1).toLowerCase(Locale.ROOT);
        switch (candidate) {
            case "mp3":
            case "m4a":
            case "aac":
            case "wav":
            case "ogg":
            case "opus":
            case "flac":
                return "." + candidate;
            default:
                String normalizedMimeType = mimeType.toLowerCase(Locale.ROOT);
                if (normalizedMimeType.contains("mpeg")) return ".mp3";
                if (normalizedMimeType.contains("mp4")) return ".m4a";
                if (normalizedMimeType.contains("wav")) return ".wav";
                if (normalizedMimeType.contains("ogg")) return ".ogg";
                if (normalizedMimeType.contains("flac")) return ".flac";
                return "";
        }
    }

    private static final class SourceMetadata {
        final String originalName;
        final String mimeType;
        final long sizeBytes;

        SourceMetadata(String originalName, String mimeType, long sizeBytes) {
            this.originalName = originalName;
            this.mimeType = mimeType;
            this.sizeBytes = sizeBytes;
        }
    }
}
