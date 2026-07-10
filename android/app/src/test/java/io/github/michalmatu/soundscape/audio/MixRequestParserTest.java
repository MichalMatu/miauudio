package io.github.michalmatu.soundscape.audio;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;

public class MixRequestParserTest {
    @Test
    public void parsesFileAndGeneratorLayers() throws Exception {
        AudioModels.MixRequest request = MixRequestParser.parse(
            new JSONObject(
                "{" +
                "\"requestId\":\"request-1\"," +
                "\"masterVolume\":0.8," +
                "\"playWhenReady\":true," +
                "\"transitionMs\":250," +
                "\"layers\":[" +
                "{\"id\":\"rain\",\"kind\":\"file\",\"source\":{\"kind\":\"asset\",\"path\":\"sounds/rain/light-rain.mp3\"},\"volume\":0.5,\"loop\":true}," +
                "{\"id\":\"binaural\",\"kind\":\"generator\",\"generator\":\"binaural\",\"settings\":{\"baseFrequency\":100,\"beatFrequency\":10},\"volume\":0.4}" +
                "]}"
            )
        );

        assertEquals("request-1", request.requestId);
        assertEquals(2, request.layers.size());
        assertEquals("sounds/rain/light-rain.mp3", request.layers.get(0).source.value);
        assertEquals("binaural", request.layers.get(1).generator);
        assertTrue(request.playWhenReady);
    }

    @Test
    public void rejectsAssetTraversal() {
        assertThrows(
            JSONException.class,
            () -> MixRequestParser.validateAssetPath("sounds/../private/file.mp3")
        );
    }

    @Test
    public void rejectsDuplicateLayerIds() {
        assertThrows(
            JSONException.class,
            () ->
                MixRequestParser.parse(
                    new JSONObject(
                        "{" +
                        "\"requestId\":\"request-1\",\"masterVolume\":1,\"playWhenReady\":false,\"transitionMs\":0," +
                        "\"layers\":[" +
                        "{\"id\":\"same\",\"kind\":\"file\",\"source\":{\"kind\":\"asset\",\"path\":\"sounds/a.mp3\"},\"volume\":1,\"loop\":true}," +
                        "{\"id\":\"same\",\"kind\":\"file\",\"source\":{\"kind\":\"asset\",\"path\":\"sounds/b.mp3\"},\"volume\":1,\"loop\":true}" +
                        "]}"
                    )
                )
        );
    }

    @Test
    public void normalizesImportedSoundLabels() throws IOException {
        assertEquals("Night rain", ImportedSoundRepository.sanitizeLabel("  Night\n rain  "));
        assertThrows(IOException.class, () -> ImportedSoundRepository.sanitizeLabel(" \n "));
    }

    @Test
    public void readsIntegerJsonValuesAsLongs() throws Exception {
        JSONObject values = new JSONObject().put("duration", 60_000).put("fraction", 1.5).put("text", "500");

        assertEquals(Long.valueOf(60_000), PluginArguments.integralLong(values, "duration"));
        assertNull(PluginArguments.integralLong(values, "fraction"));
        assertNull(PluginArguments.integralLong(values, "text"));
        assertNull(PluginArguments.integralLong(values, "missing"));
    }
}
