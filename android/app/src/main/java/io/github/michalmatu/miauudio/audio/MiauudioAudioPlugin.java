package io.github.michalmatu.miauudio.audio;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "MiauudioAudio")
public final class MiauudioAudioPlugin extends Plugin {
    private static final long MAX_TIMER_MS = 7L * 24L * 60L * 60L * 1000L;
    private static final long MAX_FADE_MS = 10_000;

    private ImportedSoundRepository importedSounds;
    private ExecutorService ioExecutor;
    private BroadcastReceiver eventReceiver;

    @Override
    public void load() {
        importedSounds = new ImportedSoundRepository(getContext());
        ioExecutor = Executors.newSingleThreadExecutor();
        eventReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String raw = intent.getStringExtra(AudioEventBroadcaster.EXTRA_PAYLOAD);
                if (raw == null) return;
                try {
                    JSObject payload = new JSObject(raw);
                    if (AudioEventBroadcaster.ACTION_STATE_CHANGED.equals(intent.getAction())) {
                        notifyListeners("stateChanged", payload, true);
                    } else if (AudioEventBroadcaster.ACTION_LAYER_ERROR.equals(intent.getAction())) {
                        notifyListeners("layerError", payload, false);
                    }
                } catch (JSONException ignored) {}
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(AudioEventBroadcaster.ACTION_STATE_CHANGED);
        filter.addAction(AudioEventBroadcaster.ACTION_LAYER_ERROR);
        ContextCompat.registerReceiver(getContext(), eventReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @PluginMethod
    public void applyMix(PluginCall call) {
        final AudioModels.MixRequest request;
        try {
            request = MixRequestParser.parse(call.getData());
        } catch (JSONException error) {
            call.reject(error.getMessage(), "INVALID_ARGUMENT", error);
            return;
        }
        AudioServiceBridge.dispatch(getContext(), request.playWhenReady, service -> {
            try {
                call.resolve(toJs(service.applyMix(request).toJson()));
            } catch (JSONException error) {
                call.reject("Could not serialize playback state", "SERIALIZATION_FAILED", error);
            }
        }, error -> call.reject("Native audio service is unavailable", "SERVICE_UNAVAILABLE", error));
    }

    @PluginMethod
    public void getState(PluginCall call) {
        AudioServiceBridge.withCurrentService(
            service -> resolveState(call, service.snapshot()),
            () -> resolveState(call, AudioServiceBridge.lastSnapshot())
        );
    }

    private void resolveState(PluginCall call, AudioModels.PlaybackSnapshot snapshot) {
        try {
            call.resolve(toJs(snapshot.toJson()));
        } catch (JSONException error) {
            call.reject("Could not serialize playback state", "SERIALIZATION_FAILED", error);
        }
    }

    @PluginMethod
    public void scheduleSleepTimer(PluginCall call) {
        Long durationMs = PluginArguments.integralLong(call.getData(), "durationMs");
        Long fadeMs = PluginArguments.integralLong(call.getData(), "fadeMs");
        if (durationMs == null || durationMs <= 0 || durationMs > MAX_TIMER_MS || fadeMs == null || fadeMs < 0 || fadeMs > MAX_FADE_MS) {
            call.reject("Invalid sleep timer duration or fade", "INVALID_ARGUMENT");
            return;
        }
        AudioServiceBridge.dispatch(getContext(), false, service -> {
            try {
                call.resolve(toJs(service.scheduleSleepTimer(durationMs, fadeMs).toJson()));
            } catch (JSONException error) {
                call.reject("Could not serialize playback state", "SERIALIZATION_FAILED", error);
            }
        }, error -> call.reject("Native audio service is unavailable", "SERVICE_UNAVAILABLE", error));
    }

    @PluginMethod
    public void cancelSleepTimer(PluginCall call) {
        MiauudioPlaybackService current = AudioServiceBridge.currentService();
        if (current == null) {
            try {
                call.resolve(toJs(AudioServiceBridge.lastSnapshot().toJson()));
            } catch (JSONException error) {
                call.reject("Could not serialize playback state", "SERIALIZATION_FAILED", error);
            }
            return;
        }
        AudioServiceBridge.dispatch(getContext(), false, service -> {
            try {
                call.resolve(toJs(service.cancelSleepTimer().toJson()));
            } catch (JSONException error) {
                call.reject("Could not serialize playback state", "SERIALIZATION_FAILED", error);
            }
        }, error -> call.reject("Native audio service is unavailable", "SERVICE_UNAVAILABLE", error));
    }

    @PluginMethod
    public void listImportedSounds(PluginCall call) {
        ioExecutor.execute(() -> {
            try {
                call.resolve(importedListResult(importedSounds.list()));
            } catch (JSONException error) {
                call.reject("Could not serialize imported sounds", "SERIALIZATION_FAILED", error);
            } catch (RuntimeException error) {
                call.reject("Could not read imported sounds", "LIBRARY_FAILED", error);
            }
        });
    }

    @PluginMethod
    public void importSound(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("audio/*")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.putExtra(
            Intent.EXTRA_MIME_TYPES,
            new String[] {
                "audio/mpeg",
                "audio/mp4",
                "audio/x-m4a",
                "audio/aac",
                "audio/wav",
                "audio/x-wav",
                "audio/ogg",
                "application/ogg",
                "audio/opus",
                "audio/flac",
                "audio/3gpp"
            }
        );
        startActivityForResult(call, intent, "handleImportSound");
    }

    @ActivityCallback
    private void handleImportSound(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            JSObject response = new JSObject();
            response.put("sound", JSONObject.NULL);
            call.resolve(response);
            return;
        }

        ioExecutor.execute(() -> {
            try {
                AudioModels.ImportedSound sound = importedSounds.importFrom(uri);
                JSObject response = new JSObject();
                response.put("sound", sound.toJson());
                call.resolve(response);
            } catch (IOException error) {
                call.reject(error.getMessage(), "IMPORT_FAILED", error);
            } catch (JSONException error) {
                call.reject("Could not serialize imported sound", "SERIALIZATION_FAILED", error);
            } catch (RuntimeException error) {
                call.reject("Could not import the selected sound", "IMPORT_FAILED", error);
            }
        });
    }

    @PluginMethod
    public void deleteImportedSound(PluginCall call) {
        String id = normalized(call.getString("id"));
        if (id == null) {
            call.reject("Imported sound id is required", "INVALID_ARGUMENT");
            return;
        }
        ioExecutor.execute(() -> {
            try {
                AudioModels.ImportedSound removed = importedSounds.delete(id);
                if (removed == null) {
                    call.reject("Imported sound not found", "NOT_FOUND");
                    return;
                }
                getActivity().runOnUiThread(() -> {
                    MiauudioPlaybackService service = AudioServiceBridge.currentService();
                    if (service != null) service.removeImportedFile(removed.fileId);
                    call.resolve();
                });
            } catch (IOException error) {
                call.reject(error.getMessage(), "DELETE_FAILED", error);
            } catch (RuntimeException error) {
                call.reject("Could not delete imported sound", "DELETE_FAILED", error);
            }
        });
    }

    @PluginMethod
    public void renameImportedSound(PluginCall call) {
        String id = normalized(call.getString("id"));
        String label = normalized(call.getString("label"));
        if (id == null || label == null) {
            call.reject("Imported sound id and label are required", "INVALID_ARGUMENT");
            return;
        }
        ioExecutor.execute(() -> {
            try {
                AudioModels.ImportedSound sound = importedSounds.rename(id, label);
                JSObject response = new JSObject();
                response.put("sound", sound.toJson());
                call.resolve(response);
            } catch (IOException error) {
                call.reject(error.getMessage(), "RENAME_FAILED", error);
            } catch (JSONException error) {
                call.reject("Could not serialize imported sound", "SERIALIZATION_FAILED", error);
            } catch (RuntimeException error) {
                call.reject("Could not rename the imported sound", "RENAME_FAILED", error);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (eventReceiver != null) {
            try {
                getContext().unregisterReceiver(eventReceiver);
            } catch (IllegalArgumentException ignored) {}
            eventReceiver = null;
        }
        if (ioExecutor != null) ioExecutor.shutdown();
        super.handleOnDestroy();
    }

    private static JSObject importedListResult(List<AudioModels.ImportedSound> sounds) throws JSONException {
        JSArray array = new JSArray();
        for (AudioModels.ImportedSound sound : sounds) array.put(sound.toJson());
        JSObject result = new JSObject();
        result.put("sounds", array);
        return result;
    }

    private static JSObject toJs(JSONObject json) throws JSONException {
        return JSObject.fromJSONObject(json);
    }

    private static String normalized(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
