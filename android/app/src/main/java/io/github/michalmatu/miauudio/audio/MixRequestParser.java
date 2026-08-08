package io.github.michalmatu.miauudio.audio;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class MixRequestParser {
    private static final long MAX_TRANSITION_MS = 10_000;

    private MixRequestParser() {}

    static AudioModels.MixRequest parse(JSONObject json) throws JSONException {
        String requestId = requiredNonBlank(json, "requestId");
        double masterVolume = unitValue(json, "masterVolume");
        boolean playWhenReady = json.getBoolean("playWhenReady");
        long transitionMs = json.getLong("transitionMs");
        if (transitionMs < 0 || transitionMs > MAX_TRANSITION_MS) {
            throw new JSONException("transitionMs must be between 0 and " + MAX_TRANSITION_MS);
        }

        JSONArray inputLayers = json.getJSONArray("layers");
        List<AudioModels.Layer> layers = new ArrayList<>(inputLayers.length());
        Set<String> ids = new HashSet<>();
        for (int index = 0; index < inputLayers.length(); index++) {
            JSONObject layer = inputLayers.getJSONObject(index);
            String id = requiredNonBlank(layer, "id");
            if (!ids.add(id)) throw new JSONException("Duplicate layer id: " + id);

            String kind = requiredNonBlank(layer, "kind");
            double volume = unitValue(layer, "volume");
            if (AudioModels.Layer.FILE.equals(kind)) {
                layers.add(parseFile(id, volume, layer));
            } else if (AudioModels.Layer.GENERATOR.equals(kind)) {
                layers.add(parseGenerator(id, volume, layer));
            } else {
                throw new JSONException("Unsupported layer kind: " + kind);
            }
        }

        return new AudioModels.MixRequest(requestId, layers, masterVolume, playWhenReady, transitionMs);
    }

    private static AudioModels.Layer parseFile(String id, double volume, JSONObject layer) throws JSONException {
        JSONObject sourceJson = layer.getJSONObject("source");
        String sourceKind = requiredNonBlank(sourceJson, "kind");
        String value;
        if (AudioModels.Source.ASSET.equals(sourceKind)) {
            value = requiredNonBlank(sourceJson, "path");
            validateAssetPath(value);
        } else if (AudioModels.Source.APP_FILE.equals(sourceKind)) {
            value = requiredNonBlank(sourceJson, "fileId");
            if (value.contains("/") || value.contains("\\") || value.contains("..")) {
                throw new JSONException("Invalid app file id");
            }
        } else {
            throw new JSONException("Unsupported file source: " + sourceKind);
        }

        boolean loop = layer.getBoolean("loop");
        return AudioModels.Layer.file(id, volume, new AudioModels.Source(sourceKind, value), loop);
    }

    private static AudioModels.Layer parseGenerator(String id, double volume, JSONObject layer) throws JSONException {
        String generator = requiredNonBlank(layer, "generator");
        if (!"binaural".equals(generator) && !"isochronic".equals(generator) && !"phase".equals(generator)) {
            throw new JSONException("Unsupported generator: " + generator);
        }

        JSONObject settings = layer.getJSONObject("settings");
        double baseFrequency = settings.getDouble("baseFrequency");
        if (!Double.isFinite(baseFrequency)) {
            throw new JSONException("Generator frequencies must be finite");
        }
        if (baseFrequency < 20 || baseFrequency > 2000) {
            throw new JSONException("baseFrequency is outside the supported range");
        }

        if ("phase".equals(generator)) {
            double phaseOffset = settings.optDouble("phaseOffset", 0);
            double rotationSpeed = settings.optDouble("rotationSpeed", 0);
            if (!Double.isFinite(phaseOffset) || !Double.isFinite(rotationSpeed)) {
                throw new JSONException("Phase settings must be finite");
            }
            if (phaseOffset < 0 || phaseOffset > 360) {
                throw new JSONException("phaseOffset must be between 0 and 360");
            }
            if (rotationSpeed < 0 || rotationSpeed > 40) {
                throw new JSONException("rotationSpeed must be between 0 and 40");
            }
            double spatialDepth = settings.optDouble("spatialDepth", 100);
            if (!Double.isFinite(spatialDepth)) {
                throw new JSONException("spatialDepth must be finite");
            }
            if (spatialDepth < 0 || spatialDepth > 100) {
                throw new JSONException("spatialDepth must be between 0 and 100");
            }

            return AudioModels.Layer.generator(
                id,
                volume,
                generator,
                new AudioModels.GeneratorSettings(
                    baseFrequency,
                    0,
                    phaseOffset,
                    rotationSpeed,
                    spatialDepth
                )
            );
        }

        double beatFrequency = settings.getDouble("beatFrequency");
        if (!Double.isFinite(beatFrequency)) {
            throw new JSONException("Generator frequencies must be finite");
        }
        if (beatFrequency < 0.1 || beatFrequency > 40) {
            throw new JSONException("beatFrequency must be between 0.1 and 40");
        }
        double minimumBase = "binaural".equals(generator) ? beatFrequency / 2 + 0.1 : 20;
        if (baseFrequency < minimumBase) {
            throw new JSONException("baseFrequency is outside the supported range");
        }

        return AudioModels.Layer.generator(
            id,
            volume,
            generator,
            new AudioModels.GeneratorSettings(baseFrequency, beatFrequency, 0, 0, 0)
        );
    }

    static void validateAssetPath(String path) throws JSONException {
        if (
            path.startsWith("/") ||
            !path.startsWith("sounds/") ||
            path.contains("..") ||
            path.contains(":") ||
            path.contains("\\")
        ) {
            throw new JSONException("Invalid bundled sound path");
        }
    }

    private static double unitValue(JSONObject json, String key) throws JSONException {
        double value = json.getDouble(key);
        if (!Double.isFinite(value) || value < 0 || value > 1) {
            throw new JSONException(key + " must be between 0 and 1");
        }
        return value;
    }

    private static String requiredNonBlank(JSONObject json, String key) throws JSONException {
        String value = json.getString(key).trim();
        if (value.isEmpty()) throw new JSONException(key + " must not be blank");
        return value;
    }
}
