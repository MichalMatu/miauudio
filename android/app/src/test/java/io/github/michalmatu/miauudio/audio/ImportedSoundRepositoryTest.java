package io.github.michalmatu.miauudio.audio;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class ImportedSoundRepositoryTest {
    @Test
    public void copyWithLimitAcceptsExactBoundaryAndRejectsOverflow() throws Exception {
        byte[] exact = "12345678".getBytes(StandardCharsets.UTF_8);
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        long copied = ImportedSoundRepository.copyWithLimit(
            new ByteArrayInputStream(exact),
            output,
            exact.length
        );

        assertEquals(exact.length, copied);
        assertArrayEquals(exact, output.toByteArray());
        assertThrows(
            IOException.class,
            () ->
                ImportedSoundRepository.copyWithLimit(
                    new ByteArrayInputStream("123456789".getBytes(StandardCharsets.UTF_8)),
                    new ByteArrayOutputStream(),
                    exact.length
                )
        );
        assertThrows(
            IllegalArgumentException.class,
            () ->
                ImportedSoundRepository.copyWithLimit(
                    new ByteArrayInputStream(exact),
                    new ByteArrayOutputStream(),
                    -1
                )
        );
    }

    @Test
    public void manifestParserKeepsValidEntriesAndSkipsMalformedOrUnsafeOnes() throws Exception {
        AudioModels.ImportedSound valid = sound(
            "user-550e8400-e29b-41d4-a716-446655440000",
            "550e8400-e29b-41d4-a716-446655440000.mp3"
        );
        JSONObject unsafeFile = sound(
            "user-6ba7b810-9dad-41d1-80b4-00c04fd430c8",
            "../private.mp3"
        ).toJson();
        JSONObject unsafeId = sound("not-a-user-id", "safe.mp3").toJson();
        JSONObject malformed = new JSONObject().put("id", valid.id);
        JSONArray manifest = new JSONArray()
            .put(valid.toJson())
            .put(unsafeFile)
            .put(unsafeId)
            .put(malformed);

        List<AudioModels.ImportedSound> parsed = ImportedSoundRepository.parseManifest(
            manifest.toString()
        );

        assertEquals(1, parsed.size());
        assertEquals(valid.id, parsed.get(0).id);
        assertEquals(valid.fileId, parsed.get(0).fileId);
    }

    @Test
    public void corruptOrMissingManifestIsTreatedAsEmpty() {
        assertTrue(ImportedSoundRepository.parseManifest(null).isEmpty());
        assertTrue(ImportedSoundRepository.parseManifest("not-json").isEmpty());
        assertTrue(ImportedSoundRepository.parseManifest("{}").isEmpty());
    }

    @Test
    public void providerFilenamesAreReducedToSafeDisplayNames() {
        assertEquals(
            "night rain.mp3",
            ImportedSoundRepository.sanitizeProviderFilename("../folder\\night\nrain.mp3")
        );
        assertEquals("Imported sound", ImportedSoundRepository.sanitizeProviderFilename(null));
        assertEquals("recording", ImportedSoundRepository.stripExtension("recording.mp3"));
        assertEquals(".recording", ImportedSoundRepository.stripExtension(".recording"));
    }

    @Test
    public void extensionsPreferKnownFilenameThenFallBackToMimeType() {
        assertEquals(".mp3", ImportedSoundRepository.safeExtension("RAIN.MP3", "application/octet-stream"));
        assertEquals(".flac", ImportedSoundRepository.safeExtension("recording.bin", "Audio/FLAC"));
        assertEquals("", ImportedSoundRepository.safeExtension("recording.exe", "application/octet-stream"));
    }

    @Test
    public void manifestIdentifiersRejectTraversalAndInvalidUserIds() {
        assertTrue(ImportedSoundRepository.isSafeFileId("550e8400-e29b-41d4-a716-446655440000.mp3"));
        assertFalse(ImportedSoundRepository.isSafeFileId("../rain.mp3"));
        assertFalse(ImportedSoundRepository.isSafeFileId("folder/rain.mp3"));
        assertTrue(ImportedSoundRepository.isSafeSoundId("user-550e8400-e29b-41d4-a716-446655440000"));
        assertFalse(ImportedSoundRepository.isSafeSoundId("550e8400-e29b-41d4-a716-446655440000"));
    }

    @Test
    public void interruptedDeleteRestoresTombstoneStillReferencedByManifest() throws Exception {
        File directory = Files.createTempDirectory("miauudio-imports").toFile();
        String fileId = "550e8400-e29b-41d4-a716-446655440000.mp3";
        File tombstone = new File(directory, "." + fileId + ".delete-" + UUID.randomUUID());
        File destination = new File(directory, fileId);
        byte[] contents = "private audio".getBytes(StandardCharsets.UTF_8);

        try {
            Files.write(tombstone.toPath(), contents);

            ImportedSoundRepository.recoverTemporaryFiles(
                directory,
                List.of(sound("user-550e8400-e29b-41d4-a716-446655440000", fileId))
            );

            assertTrue(destination.isFile());
            assertArrayEquals(contents, Files.readAllBytes(destination.toPath()));
            assertFalse(tombstone.exists());
        } finally {
            deleteRecursively(directory);
        }
    }

    @Test
    public void committedDeleteRemovesTombstoneNoLongerReferencedByManifest() throws Exception {
        File directory = Files.createTempDirectory("miauudio-imports").toFile();
        String fileId = "550e8400-e29b-41d4-a716-446655440000.mp3";
        File tombstone = new File(directory, "." + fileId + ".delete-" + UUID.randomUUID());

        try {
            Files.write(tombstone.toPath(), "private audio".getBytes(StandardCharsets.UTF_8));

            ImportedSoundRepository.recoverTemporaryFiles(directory, Collections.emptyList());

            assertFalse(tombstone.exists());
            assertFalse(new File(directory, fileId).exists());
        } finally {
            deleteRecursively(directory);
        }
    }

    @Test
    public void recoveryLeavesCollisionsAndMalformedNamesUntouchedButCleansImportParts() throws Exception {
        File directory = Files.createTempDirectory("miauudio-imports").toFile();
        String fileId = "550e8400-e29b-41d4-a716-446655440000.mp3";
        File destination = new File(directory, fileId);
        File collidingTombstone = new File(directory, "." + fileId + ".delete-" + UUID.randomUUID());
        File malformedTombstone = new File(directory, "." + fileId + ".delete-not-a-uuid");
        File importPart = new File(directory, "." + fileId + ".part.mp3");
        File malformedPart = new File(directory, ".notes.part");

        try {
            Files.write(destination.toPath(), "current".getBytes(StandardCharsets.UTF_8));
            Files.write(collidingTombstone.toPath(), "staged".getBytes(StandardCharsets.UTF_8));
            Files.write(malformedTombstone.toPath(), "unknown".getBytes(StandardCharsets.UTF_8));
            Files.write(importPart.toPath(), "partial".getBytes(StandardCharsets.UTF_8));
            Files.write(malformedPart.toPath(), "notes".getBytes(StandardCharsets.UTF_8));

            ImportedSoundRepository.recoverTemporaryFiles(
                directory,
                List.of(sound("user-550e8400-e29b-41d4-a716-446655440000", fileId))
            );

            assertTrue(destination.isFile());
            assertTrue(collidingTombstone.isFile());
            assertTrue(malformedTombstone.isFile());
            assertFalse(importPart.exists());
            assertTrue(malformedPart.isFile());
        } finally {
            deleteRecursively(directory);
        }
    }

    private static void deleteRecursively(File file) throws IOException {
        File[] children = file.listFiles();
        if (children != null) {
            for (File child : children) deleteRecursively(child);
        }
        Files.deleteIfExists(file.toPath());
    }

    private static AudioModels.ImportedSound sound(String id, String fileId) {
        return new AudioModels.ImportedSound(
            id,
            fileId,
            "Night rain",
            "night-rain.mp3",
            "audio/mpeg",
            90_674,
            15_987,
            1_783_748_210_680L
        );
    }
}
