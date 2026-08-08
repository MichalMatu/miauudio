package io.github.michalmatu.miauudio.audio;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;
import org.junit.Test;

public class AudioModelsSerializationTest {
    @Test
    public void roundTripsImportedSoundMetadataWithoutNarrowingLongValues() throws Exception {
        AudioModels.ImportedSound original = new AudioModels.ImportedSound(
            "user-550e8400-e29b-41d4-a716-446655440000",
            "550e8400-e29b-41d4-a716-446655440000.flac",
            "Forest at night",
            "forest-night.flac",
            "audio/flac",
            5_000_000_000L,
            7_200_000L,
            1_800_000_000_000L
        );

        AudioModels.ImportedSound restored = AudioModels.ImportedSound.fromJson(original.toJson());

        assertEquals(original.id, restored.id);
        assertEquals(original.fileId, restored.fileId);
        assertEquals(original.label, restored.label);
        assertEquals(original.originalName, restored.originalName);
        assertEquals(original.mimeType, restored.mimeType);
        assertEquals(original.sizeBytes, restored.sizeBytes);
        assertEquals(original.durationMs, restored.durationMs);
        assertEquals(original.importedAt, restored.importedAt);
    }

    @Test
    public void serializesStoppedPlaybackSnapshotWithExplicitNulls() throws Exception {
        List<String> layerIds = new ArrayList<>(List.of("rain", "binaural"));
        AudioModels.PlaybackSnapshot snapshot = new AudioModels.PlaybackSnapshot(
            "session-1",
            42,
            null,
            false,
            "idle",
            layerIds,
            null,
            "service-created"
        );
        layerIds.clear();

        JSONObject json = snapshot.toJson();

        assertEquals("session-1", json.getString("sessionId"));
        assertEquals(42, json.getLong("sequence"));
        assertTrue(json.isNull("requestId"));
        assertFalse(json.getBoolean("playWhenReady"));
        assertEquals("idle", json.getString("playbackState"));
        assertEquals(2, json.getJSONArray("activeLayerIds").length());
        assertEquals("rain", json.getJSONArray("activeLayerIds").getString(0));
        assertTrue(json.isNull("timerEndsAt"));
        assertEquals("service-created", json.getString("reason"));
        assertThrows(UnsupportedOperationException.class, () -> snapshot.activeLayerIds.add("wind"));
    }

    @Test
    public void serializesActiveRequestAndSleepTimer() throws Exception {
        AudioModels.PlaybackSnapshot snapshot = new AudioModels.PlaybackSnapshot(
            "session-2",
            43,
            "request-7",
            true,
            "ready",
            List.of("waves"),
            1_800_000_060_000L,
            "mix-applied"
        );

        JSONObject json = snapshot.toJson();

        assertEquals("request-7", json.getString("requestId"));
        assertTrue(json.getBoolean("playWhenReady"));
        assertEquals(1_800_000_060_000L, json.getLong("timerEndsAt"));
        assertEquals("waves", json.getJSONArray("activeLayerIds").getString(0));
    }
}
