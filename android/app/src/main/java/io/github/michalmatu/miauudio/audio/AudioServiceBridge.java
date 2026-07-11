package io.github.michalmatu.miauudio.audio;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import java.lang.ref.WeakReference;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Queue;

final class AudioServiceBridge {
    interface Command {
        void run(MiauudioPlaybackService service);
    }

    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final Queue<Command> PENDING = new ArrayDeque<>();
    private static WeakReference<MiauudioPlaybackService> serviceReference = new WeakReference<>(null);
    private static volatile AudioModels.PlaybackSnapshot lastSnapshot = new AudioModels.PlaybackSnapshot(
        "inactive",
        0,
        null,
        false,
        "idle",
        Collections.emptyList(),
        null,
        "service"
    );

    private AudioServiceBridge() {}

    static void attach(MiauudioPlaybackService service) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            MAIN.post(() -> attach(service));
            return;
        }
        serviceReference = new WeakReference<>(service);
        Command command;
        while ((command = PENDING.poll()) != null) command.run(service);
    }

    static void detach(MiauudioPlaybackService service) {
        if (serviceReference.get() == service) serviceReference.clear();
    }

    static void dispatch(Context context, boolean foreground, Command command) {
        MAIN.post(() -> {
            MiauudioPlaybackService service = serviceReference.get();
            if (service != null) {
                command.run(service);
                return;
            }
            PENDING.add(command);
            Intent intent = new Intent(context.getApplicationContext(), MiauudioPlaybackService.class)
                .setAction(MiauudioPlaybackService.ACTION_INITIALIZE);
            if (foreground) ContextCompat.startForegroundService(context.getApplicationContext(), intent);
            else context.getApplicationContext().startService(intent);
        });
    }

    static void withCurrentService(Command command, Runnable unavailable) {
        MAIN.post(() -> {
            MiauudioPlaybackService service = serviceReference.get();
            if (service != null) command.run(service);
            else unavailable.run();
        });
    }

    static @Nullable MiauudioPlaybackService currentService() {
        return serviceReference.get();
    }

    static AudioModels.PlaybackSnapshot lastSnapshot() {
        return lastSnapshot;
    }

    static void setLastSnapshot(AudioModels.PlaybackSnapshot snapshot) {
        lastSnapshot = snapshot;
    }
}
