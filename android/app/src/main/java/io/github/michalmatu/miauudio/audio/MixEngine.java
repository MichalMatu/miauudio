package io.github.michalmatu.miauudio.audio;

import android.animation.ValueAnimator;
import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class MixEngine {
    interface Listener {
        void onEngineStateChanged();
        void onLayerError(String layerId, String code, String message);
    }

    private static final AudioAttributes AUDIO_ATTRIBUTES = new AudioAttributes.Builder()
        .setUsage(C.USAGE_MEDIA)
        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
        .build();
    private static final long WAKE_LOCK_TIMEOUT_MS = 10 * 60 * 1000L;
    private static final long WAKE_LOCK_RENEWAL_MS = 9 * 60 * 1000L;

    private final Context context;
    private final ImportedSoundRepository importedSounds;
    private final Listener listener;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, AudioModels.Layer> activeLayers = new LinkedHashMap<>();
    private final Map<String, FileLayer> fileLayers = new LinkedHashMap<>();
    private final List<FileLayer> retiringFileLayers = new ArrayList<>();
    private final ProceduralAudioTrack generators;
    private final PowerManager.WakeLock wakeLock;
    private final Runnable renewWakeLock = this::renewWakeLock;

    private double masterVolume = 1;
    private double duckMultiplier = 1;
    private boolean playing;
    private boolean released;
    private long transitionGeneration;

    MixEngine(Context context, ImportedSoundRepository importedSounds, Listener listener) {
        this.context = context.getApplicationContext();
        this.importedSounds = importedSounds;
        this.listener = listener;
        this.generators = new ProceduralAudioTrack(this::handleGeneratorError);
        PowerManager powerManager = (PowerManager) this.context.getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Miauudio:Playback");
        wakeLock.setReferenceCounted(false);
    }

    void apply(AudioModels.MixRequest request) {
        checkMainThread();
        if (released) return;
        masterVolume = request.masterVolume;

        Map<String, AudioModels.Layer> next = new LinkedHashMap<>();
        for (AudioModels.Layer layer : request.layers) {
            if (AudioModels.Layer.FILE.equals(layer.kind) && resolveUri(layer) == null) {
                listener.onLayerError(layer.id, "missing", "The sound file is no longer available");
                continue;
            }
            next.put(layer.id, layer);
        }

        for (String id : new ArrayList<>(activeLayers.keySet())) {
            if (!next.containsKey(id)) removeLayer(id, request.transitionMs);
        }

        for (AudioModels.Layer layer : next.values()) {
            AudioModels.Layer previous = activeLayers.get(layer.id);
            if (AudioModels.Layer.FILE.equals(layer.kind)) {
                if (previous == null || !sameFileSource(previous, layer)) {
                    if (previous != null) removeLayer(layer.id, request.transitionMs);
                    addFileLayer(layer);
                } else {
                    FileLayer file = fileLayers.get(layer.id);
                    if (file != null) {
                        file.layer = layer;
                        file.player.setRepeatMode(layer.loop ? Player.REPEAT_MODE_ONE : Player.REPEAT_MODE_OFF);
                    }
                }
            } else if (previous != null && AudioModels.Layer.FILE.equals(previous.kind)) {
                removeLayer(layer.id, request.transitionMs);
            }
            activeLayers.put(layer.id, layer);
        }

        activeLayers.keySet().retainAll(next.keySet());
        generators.apply(new ArrayList<>(activeLayers.values()), currentOutputMultiplier(), request.transitionMs);
        updateFileVolumes(request.transitionMs);
        listener.onEngineStateChanged();
    }

    void setPlaying(boolean value, long transitionMs) {
        checkMainThread();
        if (released) return;
        boolean next = value && !activeLayers.isEmpty();
        transitionGeneration++;
        long generation = transitionGeneration;
        playing = next;

        if (next) {
            acquireWakeLock();
            for (FileLayer layer : fileLayers.values()) layer.player.play();
            generators.setPlaying(generators.hasVoices());
            updateFileVolumes(transitionMs);
            generators.setOutputMultiplier(currentOutputMultiplier(), transitionMs);
        } else {
            for (FileLayer layer : fileLayers.values()) layer.setTargetVolume(0, transitionMs);
            generators.setOutputMultiplier(0, transitionMs);
            Runnable finishPause = () -> {
                if (released || generation != transitionGeneration || playing) return;
                for (FileLayer layer : fileLayers.values()) layer.player.pause();
                generators.setPlaying(false);
                releaseWakeLock();
                listener.onEngineStateChanged();
            };
            if (transitionMs == 0) finishPause.run();
            else handler.postDelayed(finishPause, transitionMs);
        }
        listener.onEngineStateChanged();
    }

    void setDuckMultiplier(double multiplier, long transitionMs) {
        checkMainThread();
        duckMultiplier = Math.max(0, Math.min(1, multiplier));
        if (playing) {
            updateFileVolumes(transitionMs);
            generators.setOutputMultiplier(currentOutputMultiplier(), transitionMs);
        }
    }

    void removeImportedFile(String fileId) {
        checkMainThread();
        for (AudioModels.Layer layer : new ArrayList<>(activeLayers.values())) {
            if (
                layer.source != null &&
                AudioModels.Source.APP_FILE.equals(layer.source.kind) &&
                fileId.equals(layer.source.value)
            ) {
                removeLayer(layer.id, 0);
                activeLayers.remove(layer.id);
            }
        }
        generators.apply(new ArrayList<>(activeLayers.values()), currentOutputMultiplier(), 0);
        if (activeLayers.isEmpty()) setPlaying(false, 0);
        listener.onEngineStateChanged();
    }

    List<String> activeLayerIds() {
        return new ArrayList<>(activeLayers.keySet());
    }

    boolean hasActiveLayers() {
        return !activeLayers.isEmpty();
    }

    boolean isBuffering() {
        for (FileLayer layer : fileLayers.values()) {
            int state = layer.player.getPlaybackState();
            if (state == Player.STATE_IDLE || state == Player.STATE_BUFFERING) return true;
        }
        return false;
    }

    boolean isPlaying() {
        return playing;
    }

    void release() {
        checkMainThread();
        if (released) return;
        released = true;
        transitionGeneration++;
        handler.removeCallbacksAndMessages(null);
        for (FileLayer layer : fileLayers.values()) layer.release();
        for (FileLayer layer : retiringFileLayers) layer.release();
        fileLayers.clear();
        retiringFileLayers.clear();
        activeLayers.clear();
        generators.release();
        releaseWakeLock();
    }

    private void addFileLayer(AudioModels.Layer layer) {
        Uri uri = resolveUri(layer);
        if (uri == null) return;
        FileLayer fileLayer = new FileLayer(layer, uri);
        fileLayers.put(layer.id, fileLayer);
    }

    private void handleGeneratorError(String layerId, String message) {
        handler.post(() -> {
            generators.removeVoice(layerId);
            listener.onLayerError(layerId, "engine", message);
            activeLayers.remove(layerId);
            listener.onEngineStateChanged();
        });
    }

    private void removeLayer(String id, long transitionMs) {
        FileLayer file = fileLayers.remove(id);
        if (file != null) {
            file.setTargetVolume(0, transitionMs);
            if (transitionMs == 0) file.release();
            else {
                retiringFileLayers.add(file);
                handler.postDelayed(() -> {
                    retiringFileLayers.remove(file);
                    file.release();
                }, transitionMs);
            }
        }
        activeLayers.remove(id);
    }

    private void updateFileVolumes(long transitionMs) {
        double output = currentOutputMultiplier();
        for (FileLayer file : fileLayers.values()) {
            file.setTargetVolume(file.layer.volume * output, transitionMs);
        }
    }

    private double currentOutputMultiplier() {
        return playing ? masterVolume * duckMultiplier : 0;
    }

    private @Nullable Uri resolveUri(AudioModels.Layer layer) {
        if (layer.source == null) return null;
        if (AudioModels.Source.ASSET.equals(layer.source.kind)) {
            return Uri.parse("asset:///public/" + layer.source.value);
        }
        File file = importedSounds.resolveFile(layer.source.value);
        return file == null ? null : Uri.fromFile(file);
    }

    private static boolean sameFileSource(AudioModels.Layer first, AudioModels.Layer second) {
        return (
            first.source != null &&
            second.source != null &&
            first.source.kind.equals(second.source.kind) &&
            first.source.value.equals(second.source.value)
        );
    }

    private void acquireWakeLock() {
        handler.removeCallbacks(renewWakeLock);
        if (wakeLock.isHeld()) wakeLock.release();
        wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS);
        handler.postDelayed(renewWakeLock, WAKE_LOCK_RENEWAL_MS);
    }

    private void renewWakeLock() {
        if (!released && playing) acquireWakeLock();
    }

    private void releaseWakeLock() {
        handler.removeCallbacks(renewWakeLock);
        if (wakeLock.isHeld()) wakeLock.release();
    }

    private static void checkMainThread() {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            throw new IllegalStateException("MixEngine must be accessed on the main thread");
        }
    }

    private final class FileLayer implements Player.Listener {
        AudioModels.Layer layer;
        final ExoPlayer player;
        @Nullable ValueAnimator volumeAnimator;
        boolean released;

        FileLayer(AudioModels.Layer layer, Uri uri) {
            this.layer = layer;
            player = new ExoPlayer.Builder(context).build();
            player.setAudioAttributes(AUDIO_ATTRIBUTES, false);
            player.setHandleAudioBecomingNoisy(false);
            player.setRepeatMode(layer.loop ? Player.REPEAT_MODE_ONE : Player.REPEAT_MODE_OFF);
            player.setVolume(0);
            player.addListener(this);
            player.setMediaItem(MediaItem.fromUri(uri));
            player.prepare();
            if (playing) player.play();
        }

        void setTargetVolume(double target, long transitionMs) {
            if (released) return;
            if (volumeAnimator != null) volumeAnimator.cancel();
            float clamped = (float) Math.max(0, Math.min(1, target));
            if (transitionMs == 0) {
                player.setVolume(clamped);
                return;
            }
            volumeAnimator = ValueAnimator.ofFloat(player.getVolume(), clamped);
            volumeAnimator.setDuration(transitionMs);
            volumeAnimator.addUpdateListener(animation -> player.setVolume((float) animation.getAnimatedValue()));
            volumeAnimator.start();
        }

        void release() {
            if (released) return;
            released = true;
            if (volumeAnimator != null) volumeAnimator.cancel();
            player.removeListener(this);
            player.release();
        }

        @Override
        public void onPlaybackStateChanged(int playbackState) {
            listener.onEngineStateChanged();
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            String failedId = layer.id;
            listener.onLayerError(failedId, "decode", error.getMessage() == null ? "Sound playback failed" : error.getMessage());
            removeLayer(failedId, 0);
            listener.onEngineStateChanged();
        }
    }
}
