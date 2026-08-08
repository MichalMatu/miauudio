package io.github.michalmatu.miauudio.audio;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;

public class MixRequestValidationTest {
    @Test
    public void acceptsInclusiveRequestAndGeneratorBoundaries() throws Exception {
        JSONObject layer = generatorLayer("binaural", "binaural", 0, 20.1, 40);
        JSONObject input = validRequest()
            .put("requestId", "  boundary-request  ")
            .put("masterVolume", 0)
            .put("transitionMs", 10_000)
            .put("layers", new JSONArray().put(layer));

        AudioModels.MixRequest request = MixRequestParser.parse(input);

        assertEquals("boundary-request", request.requestId);
        assertEquals(0, request.masterVolume, 0);
        assertEquals(10_000, request.transitionMs);
        assertEquals(1, request.layers.size());
        assertEquals(20.1, request.layers.get(0).settings.baseFrequency, 0);
        assertEquals(40, request.layers.get(0).settings.beatFrequency, 0);
    }

    @Test
    public void rejectsRequestAndLayerValuesOutsideBounds() throws Exception {
        assertInvalid(validRequest().put("masterVolume", -0.01));
        assertInvalid(validRequest().put("masterVolume", 1.01));
        assertInvalid(validRequest().put("transitionMs", -1));
        assertInvalid(validRequest().put("transitionMs", 10_001));

        JSONObject negativeVolume = validRequest().put(
            "layers",
            new JSONArray().put(assetLayer("rain", -0.01, "sounds/rain/light-rain.mp3"))
        );
        JSONObject excessiveVolume = validRequest().put(
            "layers",
            new JSONArray().put(assetLayer("rain", 1.01, "sounds/rain/light-rain.mp3"))
        );

        assertInvalid(negativeVolume);
        assertInvalid(excessiveVolume);
    }

    @Test
    public void rejectsUnsafeFileSources() throws Exception {
        String[] invalidAssets = {
            "/sounds/rain.mp3",
            "private/rain.mp3",
            "sounds/../private/rain.mp3",
            "sounds/http:rain.mp3",
            "sounds\\rain.mp3"
        };
        for (String path : invalidAssets) {
            assertThrows(JSONException.class, () -> MixRequestParser.validateAssetPath(path));
        }

        String[] invalidFileIds = { "../rain.mp3", "folder/rain.mp3", "folder\\rain.mp3" };
        for (String fileId : invalidFileIds) {
            JSONObject input = validRequest().put(
                "layers",
                new JSONArray().put(appFileLayer("imported", fileId))
            );
            assertInvalid(input);
        }
    }

    @Test
    public void parsesAValidatedImportedFileLayer() throws Exception {
        JSONObject input = validRequest().put(
            "layers",
            new JSONArray().put(appFileLayer("  imported  ", "550e8400-e29b-41d4-a716-446655440000.mp3"))
        );

        AudioModels.Layer layer = MixRequestParser.parse(input).layers.get(0);

        assertEquals("imported", layer.id);
        assertEquals(AudioModels.Source.APP_FILE, layer.source.kind);
        assertEquals("550e8400-e29b-41d4-a716-446655440000.mp3", layer.source.value);
        assertFalse(layer.loop);
    }

    @Test
    public void parsesPhaseGeneratorSettings() throws Exception {
        JSONObject input = validRequest().put(
            "layers",
            new JSONArray().put(
                new JSONObject()
                    .put("id", "phase")
                    .put("kind", AudioModels.Layer.GENERATOR)
                    .put("generator", "phase")
                    .put(
                        "settings",
                        new JSONObject()
                            .put("baseFrequency", 100)
                            .put("phaseOffset", 180)
                            .put("rotationSpeed", 0.5)
                            .put("spatialDepth", 80)
                    )
                    .put("volume", 0.5)
            )
        );

        AudioModels.Layer layer = MixRequestParser.parse(input).layers.get(0);

        assertEquals("phase", layer.generator);
        assertEquals(100, layer.settings.baseFrequency, 0);
        assertEquals(180, layer.settings.phaseOffset, 0);
        assertEquals(0.5, layer.settings.rotationSpeed, 0);
        assertEquals(80, layer.settings.spatialDepth, 0);
    }

    @Test
    public void rejectsUnsupportedKindsAndInvalidGeneratorFrequencies() throws Exception {
        JSONObject unsupportedLayer = assetLayer("rain", 0.5, "sounds/rain/light-rain.mp3").put(
            "kind",
            "stream"
        );
        assertInvalid(validRequest().put("layers", new JSONArray().put(unsupportedLayer)));

        JSONObject unsupportedSource = assetLayer("rain", 0.5, "sounds/rain/light-rain.mp3");
        unsupportedSource.getJSONObject("source").put("kind", "content-uri");
        assertInvalid(validRequest().put("layers", new JSONArray().put(unsupportedSource)));

        assertInvalid(
            validRequest().put(
                "layers",
                new JSONArray().put(generatorLayer("tone", "unsupported", 0.5, 100, 10))
            )
        );
        assertInvalid(
            validRequest().put(
                "layers",
                new JSONArray().put(generatorLayer("tone", "binaural", 0.5, 100, 0.09))
            )
        );
        assertInvalid(
            validRequest().put(
                "layers",
                new JSONArray().put(generatorLayer("tone", "binaural", 0.5, 5, 10))
            )
        );
        assertInvalid(
            validRequest().put(
                "layers",
                new JSONArray().put(generatorLayer("tone", "isochronic", 0.5, 2_001, 10))
            )
        );
    }

    @Test
    public void requiresNonBlankRequestAndLayerIds() throws Exception {
        assertInvalid(validRequest().put("requestId", " \n "));

        JSONObject blankLayer = assetLayer(" \t ", 0.5, "sounds/rain/light-rain.mp3");
        assertInvalid(validRequest().put("layers", new JSONArray().put(blankLayer)));
    }

    @Test
    public void normalizesAndLimitsImportedSoundLabels() throws Exception {
        assertEquals(
            "Night rain recording",
            ImportedSoundRepository.sanitizeLabel(" \tNight\n rain\r recording ")
        );
        assertThrows(IOException.class, () -> ImportedSoundRepository.sanitizeLabel(null));
        assertThrows(IOException.class, () -> ImportedSoundRepository.sanitizeLabel("\n\t"));

        String normalized = ImportedSoundRepository.sanitizeLabel("a".repeat(85));
        assertEquals(80, normalized.length());
        assertTrue(normalized.endsWith("a"));
    }

    private static JSONObject validRequest() throws JSONException {
        return new JSONObject()
            .put("requestId", "request-1")
            .put("masterVolume", 0.8)
            .put("playWhenReady", true)
            .put("transitionMs", 250)
            .put("layers", new JSONArray());
    }

    private static JSONObject assetLayer(String id, double volume, String path) throws JSONException {
        return new JSONObject()
            .put("id", id)
            .put("kind", AudioModels.Layer.FILE)
            .put("source", new JSONObject().put("kind", AudioModels.Source.ASSET).put("path", path))
            .put("volume", volume)
            .put("loop", true);
    }

    private static JSONObject appFileLayer(String id, String fileId) throws JSONException {
        return new JSONObject()
            .put("id", id)
            .put("kind", AudioModels.Layer.FILE)
            .put("source", new JSONObject().put("kind", AudioModels.Source.APP_FILE).put("fileId", fileId))
            .put("volume", 0.4)
            .put("loop", false);
    }

    private static JSONObject generatorLayer(
        String id,
        String generator,
        double volume,
        double baseFrequency,
        double beatFrequency
    ) throws JSONException {
        return new JSONObject()
            .put("id", id)
            .put("kind", AudioModels.Layer.GENERATOR)
            .put("generator", generator)
            .put("settings", new JSONObject().put("baseFrequency", baseFrequency).put("beatFrequency", beatFrequency))
            .put("volume", volume);
    }

    private static void assertInvalid(JSONObject input) {
        assertThrows(JSONException.class, () -> MixRequestParser.parse(input));
    }
}
