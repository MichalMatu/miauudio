package io.github.michalmatu.miauudio.audio;

import androidx.annotation.Nullable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class AudioModels {
    private AudioModels() {}

    static final class GeneratorSettings {
        final double baseFrequency;
        final double beatFrequency;

        GeneratorSettings(double baseFrequency, double beatFrequency) {
            this.baseFrequency = baseFrequency;
            this.beatFrequency = beatFrequency;
        }
    }

    static final class Source {
        static final String ASSET = "asset";
        static final String APP_FILE = "app-file";

        final String kind;
        final String value;

        Source(String kind, String value) {
            this.kind = kind;
            this.value = value;
        }
    }

    static final class Layer {
        static final String FILE = "file";
        static final String GENERATOR = "generator";

        final String id;
        final String kind;
        final double volume;
        @Nullable final Source source;
        final boolean loop;
        @Nullable final String generator;
        @Nullable final GeneratorSettings settings;

        private Layer(
            String id,
            String kind,
            double volume,
            @Nullable Source source,
            boolean loop,
            @Nullable String generator,
            @Nullable GeneratorSettings settings
        ) {
            this.id = id;
            this.kind = kind;
            this.volume = volume;
            this.source = source;
            this.loop = loop;
            this.generator = generator;
            this.settings = settings;
        }

        static Layer file(String id, double volume, Source source, boolean loop) {
            return new Layer(id, FILE, volume, source, loop, null, null);
        }

        static Layer generator(String id, double volume, String generator, GeneratorSettings settings) {
            return new Layer(id, GENERATOR, volume, null, true, generator, settings);
        }
    }

    static final class MixRequest {
        final String requestId;
        final List<Layer> layers;
        final double masterVolume;
        final boolean playWhenReady;
        final long transitionMs;

        MixRequest(String requestId, List<Layer> layers, double masterVolume, boolean playWhenReady, long transitionMs) {
            this.requestId = requestId;
            this.layers = Collections.unmodifiableList(new ArrayList<>(layers));
            this.masterVolume = masterVolume;
            this.playWhenReady = playWhenReady;
            this.transitionMs = transitionMs;
        }
    }

    static final class ImportedSound {
        final String id;
        final String fileId;
        final String label;
        final String originalName;
        final String mimeType;
        final long sizeBytes;
        final long durationMs;
        final long importedAt;

        ImportedSound(
            String id,
            String fileId,
            String label,
            String originalName,
            String mimeType,
            long sizeBytes,
            long durationMs,
            long importedAt
        ) {
            this.id = id;
            this.fileId = fileId;
            this.label = label;
            this.originalName = originalName;
            this.mimeType = mimeType;
            this.sizeBytes = sizeBytes;
            this.durationMs = durationMs;
            this.importedAt = importedAt;
        }

        JSONObject toJson() throws JSONException {
            return new JSONObject()
                .put("id", id)
                .put("fileId", fileId)
                .put("label", label)
                .put("originalName", originalName)
                .put("mimeType", mimeType)
                .put("sizeBytes", sizeBytes)
                .put("durationMs", durationMs)
                .put("importedAt", importedAt);
        }

        static ImportedSound fromJson(JSONObject json) throws JSONException {
            return new ImportedSound(
                json.getString("id"),
                json.getString("fileId"),
                json.getString("label"),
                json.getString("originalName"),
                json.getString("mimeType"),
                json.getLong("sizeBytes"),
                json.getLong("durationMs"),
                json.getLong("importedAt")
            );
        }
    }

    static final class PlaybackSnapshot {
        final String sessionId;
        final long sequence;
        @Nullable final String requestId;
        final boolean playWhenReady;
        final String playbackState;
        final List<String> activeLayerIds;
        @Nullable final Long timerEndsAt;
        final String reason;

        PlaybackSnapshot(
            String sessionId,
            long sequence,
            @Nullable String requestId,
            boolean playWhenReady,
            String playbackState,
            List<String> activeLayerIds,
            @Nullable Long timerEndsAt,
            String reason
        ) {
            this.sessionId = sessionId;
            this.sequence = sequence;
            this.requestId = requestId;
            this.playWhenReady = playWhenReady;
            this.playbackState = playbackState;
            this.activeLayerIds = Collections.unmodifiableList(new ArrayList<>(activeLayerIds));
            this.timerEndsAt = timerEndsAt;
            this.reason = reason;
        }

        JSONObject toJson() throws JSONException {
            JSONObject json = new JSONObject()
                .put("sessionId", sessionId)
                .put("sequence", sequence)
                .put("requestId", requestId == null ? JSONObject.NULL : requestId)
                .put("playWhenReady", playWhenReady)
                .put("playbackState", playbackState)
                .put("activeLayerIds", new JSONArray(activeLayerIds))
                .put("timerEndsAt", timerEndsAt == null ? JSONObject.NULL : timerEndsAt)
                .put("reason", reason);
            return json;
        }
    }
}
