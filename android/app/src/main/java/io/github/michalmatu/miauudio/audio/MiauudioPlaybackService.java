package io.github.michalmatu.miauudio.audio;

import android.app.PendingIntent;
import android.content.Intent;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

@OptIn(markerClass = UnstableApi.class)
public final class MiauudioPlaybackService extends MediaSessionService implements MixPlayer.Listener {
    static final String ACTION_INITIALIZE = "io.github.michalmatu.miauudio.audio.INITIALIZE";

    private MixPlayer player;
    private MediaSession mediaSession;
    private AudioEventBroadcaster events;

    @Override
    public void onCreate() {
        super.onCreate();
        events = new AudioEventBroadcaster(this);
        ImportedSoundRepository importedSounds = new ImportedSoundRepository(this);
        player = new MixPlayer(this, importedSounds, this);

        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        MediaSession.Builder sessionBuilder = new MediaSession.Builder(this, player);
        if (launchIntent != null) {
            PendingIntent sessionActivity = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            sessionBuilder.setSessionActivity(sessionActivity);
        }
        mediaSession = sessionBuilder.build();
        addSession(mediaSession);
        AudioServiceBridge.attach(this);
        onSnapshot(player.snapshot());
    }

    @Override
    public @Nullable MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        if (player == null || !player.getPlayWhenReady()) stopSelf();
        else super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        AudioServiceBridge.detach(this);
        if (mediaSession != null) {
            removeSession(mediaSession);
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }

    AudioModels.PlaybackSnapshot applyMix(AudioModels.MixRequest request) {
        return player.applyMix(request);
    }

    AudioModels.PlaybackSnapshot scheduleSleepTimer(long durationMs, long fadeMs) {
        return player.scheduleSleepTimer(durationMs, fadeMs);
    }

    AudioModels.PlaybackSnapshot cancelSleepTimer() {
        return player.cancelSleepTimer();
    }

    void removeImportedFile(String fileId) {
        player.removeImportedFile(fileId);
    }

    AudioModels.PlaybackSnapshot snapshot() {
        return player.snapshot();
    }

    @Override
    public void onSnapshot(AudioModels.PlaybackSnapshot snapshot) {
        events.stateChanged(snapshot);
    }

    @Override
    public void onLayerError(String layerId, String code, String message) {
        events.layerError(layerId, code, message);
    }
}
