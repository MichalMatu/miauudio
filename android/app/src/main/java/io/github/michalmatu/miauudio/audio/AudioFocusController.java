package io.github.michalmatu.miauudio.audio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import androidx.core.content.ContextCompat;

final class AudioFocusController {
    enum RequestResult {
        GRANTED,
        DELAYED,
        FAILED,
    }

    interface Listener {
        void onFocusGain();
        void onFocusLoss(boolean permanent);
        void onDuck(boolean ducked);
        void onBecomingNoisy();
    }

    private final Context context;
    private final AudioManager audioManager;
    private final Handler mainHandler;
    private final Listener listener;
    private final AudioManager.OnAudioFocusChangeListener focusListener;
    private final BroadcastReceiver noisyReceiver;
    private AudioFocusRequest focusRequest;
    private boolean focusHeld;

    AudioFocusController(Context context, Handler mainHandler, Listener listener) {
        this.context = context.getApplicationContext();
        this.audioManager = (AudioManager) this.context.getSystemService(Context.AUDIO_SERVICE);
        this.mainHandler = mainHandler;
        this.listener = listener;
        focusListener = change -> mainHandler.post(() -> handleFocusChange(change));
        noisyReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ignored, Intent intent) {
                if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) listener.onBecomingNoisy();
            }
        };
        ContextCompat.registerReceiver(
            this.context,
            noisyReceiver,
            new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
            ContextCompat.RECEIVER_NOT_EXPORTED
        );
    }

    RequestResult request() {
        if (focusHeld) return RequestResult.GRANTED;

        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    .setAcceptsDelayedFocusGain(true)
                    .setWillPauseWhenDucked(false)
                    .setOnAudioFocusChangeListener(focusListener, mainHandler)
                    .build();
            }
            result = audioManager.requestAudioFocus(focusRequest);
        } else {
            result = audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }

        if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            focusHeld = true;
            return RequestResult.GRANTED;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && result == AudioManager.AUDIOFOCUS_REQUEST_DELAYED) {
            return RequestResult.DELAYED;
        }
        return RequestResult.FAILED;
    }

    void abandon() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
        } else {
            audioManager.abandonAudioFocus(focusListener);
        }
        focusHeld = false;
    }

    void release() {
        abandon();
        try {
            context.unregisterReceiver(noisyReceiver);
        } catch (IllegalArgumentException ignored) {}
    }

    private void handleFocusChange(int change) {
        switch (change) {
            case AudioManager.AUDIOFOCUS_GAIN:
                focusHeld = true;
                listener.onDuck(false);
                listener.onFocusGain();
                break;
            case AudioManager.AUDIOFOCUS_LOSS:
                focusHeld = false;
                listener.onDuck(false);
                listener.onFocusLoss(true);
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                focusHeld = false;
                listener.onDuck(false);
                listener.onFocusLoss(false);
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // Android 8+ normally ducks every player owned by this UID automatically.
                // The callback still covers Android 7 and device-specific implementations.
                listener.onDuck(true);
                break;
            default:
                break;
        }
    }
}
