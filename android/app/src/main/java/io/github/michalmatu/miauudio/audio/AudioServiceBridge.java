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

    interface Failure {
        void run(RuntimeException error);
    }

    private static final long SERVICE_ATTACH_TIMEOUT_MS = 5_000;
    private static final Handler MAIN = new Handler(Looper.getMainLooper());
    private static final Queue<PendingCommand> PENDING = new ArrayDeque<>();
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
        PendingCommand pending;
        while ((pending = PENDING.poll()) != null) run(pending, service);
    }

    static void detach(MiauudioPlaybackService service) {
        if (serviceReference.get() == service) serviceReference.clear();
    }

    static void dispatch(Context context, boolean foreground, Command command, Failure failure) {
        MAIN.post(() -> {
            MiauudioPlaybackService service = serviceReference.get();
            if (service != null) {
                run(new PendingCommand(command, failure), service);
                return;
            }

            PendingCommand pending = new PendingCommand(command, failure);
            pending.timeout = () -> {
                if (PENDING.remove(pending)) {
                    pending.failure.run(new IllegalStateException("Native audio service did not start in time"));
                }
            };
            PENDING.add(pending);
            MAIN.postDelayed(pending.timeout, SERVICE_ATTACH_TIMEOUT_MS);

            Intent intent = new Intent(context.getApplicationContext(), MiauudioPlaybackService.class)
                .setAction(MiauudioPlaybackService.ACTION_INITIALIZE);
            try {
                if (foreground) ContextCompat.startForegroundService(context.getApplicationContext(), intent);
                else context.getApplicationContext().startService(intent);
            } catch (RuntimeException error) {
                if (PENDING.remove(pending)) {
                    MAIN.removeCallbacks(pending.timeout);
                    pending.failure.run(error);
                }
            }
        });
    }

    private static void run(PendingCommand pending, MiauudioPlaybackService service) {
        if (pending.timeout != null) MAIN.removeCallbacks(pending.timeout);
        try {
            pending.command.run(service);
        } catch (RuntimeException error) {
            pending.failure.run(error);
        }
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

    private static final class PendingCommand {
        final Command command;
        final Failure failure;
        @Nullable Runnable timeout;

        PendingCommand(Command command, Failure failure) {
            this.command = command;
            this.failure = failure;
        }
    }
}
