package io.github.michalmatu.miauudio.audio;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.SimpleBasePlayer;
import androidx.media3.common.util.UnstableApi;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.List;
import java.util.UUID;

@OptIn(markerClass = UnstableApi.class)
final class MixPlayer extends SimpleBasePlayer implements MixEngine.Listener, AudioFocusController.Listener {
    interface Listener {
        void onSnapshot(AudioModels.PlaybackSnapshot snapshot);
        void onLayerError(String layerId, String code, String message);
    }

    private static final long DEFAULT_TRANSITION_MS = 250;
    private static final AudioAttributes AUDIO_ATTRIBUTES = new AudioAttributes.Builder()
        .setUsage(C.USAGE_MEDIA)
        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
        .build();
    private static final Player.Commands COMMANDS = new Player.Commands.Builder()
        .addAll(
            Player.COMMAND_PLAY_PAUSE,
            Player.COMMAND_GET_CURRENT_MEDIA_ITEM,
            Player.COMMAND_GET_TIMELINE,
            Player.COMMAND_GET_METADATA,
            Player.COMMAND_GET_AUDIO_ATTRIBUTES,
            Player.COMMAND_RELEASE
        )
        .build();
    private static final MediaMetadata MIX_METADATA = new MediaMetadata.Builder()
        .setTitle("Miauudio")
        .setArtist("Ambient sound mix")
        .build();
    private static final MediaItem MIX_ITEM = new MediaItem.Builder()
        .setMediaId("miauudio-mix")
        .setMediaMetadata(MIX_METADATA)
        .build();
    private static final MediaItemData MIX_ITEM_DATA = new MediaItemData.Builder("miauudio-mix")
        .setMediaItem(MIX_ITEM)
        .setMediaMetadata(MIX_METADATA)
        .setDurationUs(C.TIME_UNSET)
        .setIsSeekable(false)
        .build();

    private final Handler handler;
    private final MixEngine engine;
    private final AudioFocusController audioFocus;
    private final Listener listener;
    private final String sessionId = UUID.randomUUID().toString();

    private long sequence;
    private @Nullable String requestId;
    private boolean playWhenReady;
    private int playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_NONE;
    private @Nullable Long timerEndsAt;
    private @Nullable Runnable timerRunnable;
    private String reason = "service";
    private boolean hasError;
    private boolean released;
    private boolean applyingMix;

    MixPlayer(Context context, ImportedSoundRepository importedSounds, Listener listener) {
        super(Looper.getMainLooper());
        this.handler = new Handler(Looper.getMainLooper());
        this.listener = listener;
        this.engine = new MixEngine(context, importedSounds, this);
        this.audioFocus = new AudioFocusController(context, handler, this);
    }

    AudioModels.PlaybackSnapshot applyMix(AudioModels.MixRequest request) {
        assertMainThread();
        requestId = request.requestId;
        hasError = false;
        applyingMix = true;
        try {
            engine.apply(request);
            if (request.playWhenReady && engine.hasActiveLayers()) startPlayback(request.transitionMs, "command");
            else pausePlayback(request.transitionMs, "command");
        } finally {
            applyingMix = false;
        }
        invalidateState();
        return publish("command");
    }

    AudioModels.PlaybackSnapshot scheduleSleepTimer(long durationMs, long fadeMs) {
        assertMainThread();
        cancelTimerInternal();
        timerEndsAt = System.currentTimeMillis() + durationMs;
        timerRunnable = () -> {
            timerRunnable = null;
            timerEndsAt = null;
            pausePlayback(fadeMs, "timer");
            invalidateState();
            publish("timer");
        };
        handler.postDelayed(timerRunnable, durationMs);
        return publish("command");
    }

    AudioModels.PlaybackSnapshot cancelSleepTimer() {
        assertMainThread();
        cancelTimerInternal();
        return publish("command");
    }

    void removeImportedFile(String fileId) {
        assertMainThread();
        engine.removeImportedFile(fileId);
        if (!engine.hasActiveLayers()) {
            playWhenReady = false;
            audioFocus.abandon();
        }
        invalidateState();
        publish("service");
    }

    AudioModels.PlaybackSnapshot snapshot() {
        assertMainThread();
        return createSnapshot(sequence, reason);
    }

    @Override
    protected State getState() {
        boolean hasLayers = engine.hasActiveLayers();
        int playbackState = !hasLayers
            ? Player.STATE_IDLE
            : engine.isBuffering()
                ? Player.STATE_BUFFERING
                : Player.STATE_READY;
        State.Builder state = new State.Builder()
            .setAvailableCommands(COMMANDS)
            .setPlayWhenReady(playWhenReady && hasLayers, Player.PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST)
            .setPlaybackState(playbackState)
            .setPlaybackSuppressionReason(playbackSuppressionReason)
            .setAudioAttributes(AUDIO_ATTRIBUTES)
            .setContentPositionMs(0);
        if (hasLayers) {
            state.setPlaylist(ImmutableList.of(MIX_ITEM_DATA)).setCurrentMediaItemIndex(0);
        }
        return state.build();
    }

    @Override
    protected ListenableFuture<?> handleSetPlayWhenReady(boolean requested) {
        if (requested && engine.hasActiveLayers()) {
            // Let SimpleBasePlayer expose playWhenReady first. MediaSessionService can then
            // promote itself before Android 15's foreground-only audio-focus check runs.
            playWhenReady = true;
            playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_TRANSIENT_AUDIO_FOCUS_LOSS;
            handler.post(() -> {
                if (released || !playWhenReady) return;
                startPlayback(DEFAULT_TRANSITION_MS, "media-button");
                invalidateState();
                publish("media-button");
            });
        } else {
            pausePlayback(DEFAULT_TRANSITION_MS, "media-button");
        }
        publish("media-button");
        return Futures.immediateVoidFuture();
    }

    @Override
    protected ListenableFuture<?> handleRelease() {
        releaseResources();
        return Futures.immediateVoidFuture();
    }

    @Override
    public void onEngineStateChanged() {
        if (released) return;
        if (applyingMix) return;
        if (!engine.hasActiveLayers() && playWhenReady) {
            playWhenReady = false;
            audioFocus.abandon();
            if (engine.isPlaying()) engine.setPlaying(false, 0);
        }
        invalidateState();
        publish("service");
    }

    @Override
    public void onLayerError(String layerId, String code, String message) {
        if (released) return;
        hasError = true;
        listener.onLayerError(layerId, code, message);
        if (applyingMix) return;
        invalidateState();
        publish("service");
    }

    @Override
    public void onFocusGain() {
        if (released || !playWhenReady) return;
        playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_NONE;
        engine.setDuckMultiplier(1, 150);
        engine.setPlaying(true, 150);
        invalidateState();
        publish("audio-focus");
    }

    @Override
    public void onFocusLoss(boolean permanent) {
        if (released) return;
        engine.setDuckMultiplier(1, 100);
        engine.setPlaying(false, 100);
        if (permanent) {
            playWhenReady = false;
            playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_NONE;
        } else {
            playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_TRANSIENT_AUDIO_FOCUS_LOSS;
        }
        invalidateState();
        publish("audio-focus");
    }

    @Override
    public void onDuck(boolean ducked) {
        if (released) return;
        engine.setDuckMultiplier(ducked ? 0.2 : 1, 150);
        publish("audio-focus");
    }

    @Override
    public void onBecomingNoisy() {
        if (released) return;
        pausePlayback(DEFAULT_TRANSITION_MS, "headphones-disconnected");
        invalidateState();
        publish("headphones-disconnected");
    }

    private void startPlayback(long transitionMs, String nextReason) {
        if (!engine.hasActiveLayers()) {
            playWhenReady = false;
            engine.setPlaying(false, transitionMs);
            return;
        }
        playWhenReady = true;
        AudioFocusController.RequestResult result = audioFocus.request();
        if (result == AudioFocusController.RequestResult.GRANTED) {
            playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_NONE;
            engine.setDuckMultiplier(1, transitionMs);
            engine.setPlaying(true, transitionMs);
        } else if (result == AudioFocusController.RequestResult.DELAYED) {
            playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_TRANSIENT_AUDIO_FOCUS_LOSS;
            engine.setPlaying(false, transitionMs);
        } else {
            playWhenReady = false;
            playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_NONE;
            engine.setPlaying(false, transitionMs);
            listener.onLayerError("mix", "engine", "Audio focus could not be acquired");
        }
        reason = nextReason;
    }

    private void pausePlayback(long transitionMs, String nextReason) {
        playWhenReady = false;
        playbackSuppressionReason = Player.PLAYBACK_SUPPRESSION_REASON_NONE;
        engine.setDuckMultiplier(1, transitionMs);
        engine.setPlaying(false, transitionMs);
        audioFocus.abandon();
        reason = nextReason;
    }

    private AudioModels.PlaybackSnapshot publish(String nextReason) {
        reason = nextReason;
        AudioModels.PlaybackSnapshot snapshot = createSnapshot(++sequence, nextReason);
        listener.onSnapshot(snapshot);
        return snapshot;
    }

    private AudioModels.PlaybackSnapshot createSnapshot(long snapshotSequence, String snapshotReason) {
        String playbackState;
        if (hasError) playbackState = "error";
        else if (!engine.hasActiveLayers()) playbackState = "idle";
        else if (engine.isBuffering()) playbackState = "buffering";
        else playbackState = "ready";
        List<String> activeIds = engine.activeLayerIds();
        return new AudioModels.PlaybackSnapshot(
            sessionId,
            snapshotSequence,
            requestId,
            playWhenReady && !activeIds.isEmpty(),
            playbackState,
            activeIds,
            timerEndsAt,
            snapshotReason
        );
    }

    private void cancelTimerInternal() {
        if (timerRunnable != null) handler.removeCallbacks(timerRunnable);
        timerRunnable = null;
        timerEndsAt = null;
    }

    private void releaseResources() {
        if (released) return;
        released = true;
        cancelTimerInternal();
        engine.release();
        audioFocus.release();
    }

    private static void assertMainThread() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            throw new IllegalStateException("MixPlayer must be accessed on the main thread");
        }
    }
}
