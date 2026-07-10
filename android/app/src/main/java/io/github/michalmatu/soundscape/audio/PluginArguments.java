package io.github.michalmatu.soundscape.audio;

import org.json.JSONObject;

final class PluginArguments {
    private PluginArguments() {}

    static Long integralLong(JSONObject data, String key) {
        Object value = data.opt(key);
        if (!(value instanceof Number number)) return null;

        double doubleValue = number.doubleValue();
        if (
            !Double.isFinite(doubleValue) ||
            doubleValue != Math.rint(doubleValue) ||
            doubleValue < Long.MIN_VALUE ||
            doubleValue > Long.MAX_VALUE
        ) {
            return null;
        }
        return number.longValue();
    }
}
