package io.github.michalmatu.soundscape.audio;

import android.content.Context;
import android.content.Intent;
import org.json.JSONException;
import org.json.JSONObject;

final class AudioEventBroadcaster {
    static final String ACTION_STATE_CHANGED = "io.github.michalmatu.soundscape.audio.STATE_CHANGED";
    static final String ACTION_LAYER_ERROR = "io.github.michalmatu.soundscape.audio.LAYER_ERROR";
    static final String EXTRA_PAYLOAD = "payload";

    private final Context context;

    AudioEventBroadcaster(Context context) {
        this.context = context.getApplicationContext();
    }

    void stateChanged(AudioModels.PlaybackSnapshot snapshot) {
        AudioServiceBridge.setLastSnapshot(snapshot);
        try {
            send(ACTION_STATE_CHANGED, snapshot.toJson());
        } catch (JSONException ignored) {}
    }

    void layerError(String layerId, String code, String message) {
        try {
            send(
                ACTION_LAYER_ERROR,
                new JSONObject().put("layerId", layerId).put("code", code).put("message", message)
            );
        } catch (JSONException ignored) {}
    }

    private void send(String action, JSONObject payload) {
        Intent intent = new Intent(action)
            .setPackage(context.getPackageName())
            .putExtra(EXTRA_PAYLOAD, payload.toString());
        context.sendBroadcast(intent);
    }
}
