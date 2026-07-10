package io.github.michalmatu.soundscape.audio;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Process;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

final class ProceduralAudioTrack {
    interface ErrorListener {
        void onGeneratorError(String layerId, String message);
    }

    private static final int FRAMES_PER_WRITE = 512;
    private static final double TWO_PI = Math.PI * 2;

    private final ConcurrentHashMap<String, Voice> voices = new ConcurrentHashMap<>();
    private final Object monitor = new Object();
    private final ErrorListener errorListener;
    private final int sampleRate;

    private volatile boolean playing;
    private volatile boolean released;
    private Thread thread;
    private AudioTrack audioTrack;

    ProceduralAudioTrack(ErrorListener errorListener) {
        this.errorListener = errorListener;
        int nativeRate = AudioTrack.getNativeOutputSampleRate(AudioManager.STREAM_MUSIC);
        sampleRate = nativeRate > 0 ? nativeRate : 48_000;
    }

    void apply(List<AudioModels.Layer> layers, double outputMultiplier, long transitionMs) {
        Set<String> retained = new HashSet<>();
        int rampFrames = rampFrames(transitionMs);
        for (AudioModels.Layer layer : layers) {
            if (!AudioModels.Layer.GENERATOR.equals(layer.kind) || layer.generator == null || layer.settings == null) continue;
            retained.add(layer.id);
            Voice voice = voices.computeIfAbsent(layer.id, ignored -> new Voice(layer.id));
            voice.generator = layer.generator;
            voice.baseFrequency = layer.settings.baseFrequency;
            voice.beatFrequency = layer.settings.beatFrequency;
            voice.layerVolume = layer.volume;
            voice.removeWhenSilent = false;
            voice.setTarget(layer.volume * outputMultiplier, rampFrames);
        }

        for (Voice voice : voices.values()) {
            if (!retained.contains(voice.id)) {
                voice.removeWhenSilent = true;
                voice.setTarget(0, rampFrames);
            }
        }
        wakeThread();
    }

    void setOutputMultiplier(double multiplier, long transitionMs) {
        int rampFrames = rampFrames(transitionMs);
        for (Voice voice : voices.values()) {
            double target = voice.removeWhenSilent ? 0 : voice.layerVolume * multiplier;
            voice.setTarget(target, rampFrames);
        }
        wakeThread();
    }

    void setPlaying(boolean value) {
        playing = value;
        if (value) ensureThread();
        wakeThread();
    }

    boolean hasVoices() {
        return !voices.isEmpty();
    }

    void removeVoice(String layerId) {
        voices.remove(layerId);
        wakeThread();
    }

    void release() {
        released = true;
        playing = false;
        wakeThread();
        Thread activeThread = thread;
        if (activeThread != null) activeThread.interrupt();
    }

    private void ensureThread() {
        synchronized (monitor) {
            if (thread != null || released) return;
            thread = new Thread(this::runAudio, "MiauudioGenerator");
            thread.start();
        }
    }

    private void runAudio() {
        Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO);
        short[] samples = new short[FRAMES_PER_WRITE * 2];
        try {
            audioTrack = createAudioTrack();
            if (audioTrack.getState() != AudioTrack.STATE_INITIALIZED) throw new IllegalStateException("AudioTrack initialization failed");

            while (!released) {
                if (!playing || voices.isEmpty()) {
                    if (audioTrack.getPlayState() == AudioTrack.PLAYSTATE_PLAYING) audioTrack.pause();
                    synchronized (monitor) {
                        if (!released && (!playing || voices.isEmpty())) monitor.wait(500);
                    }
                    continue;
                }

                if (audioTrack.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) audioTrack.play();
                render(samples);
                int written = audioTrack.write(samples, 0, samples.length, AudioTrack.WRITE_BLOCKING);
                if (written < 0) throw new IllegalStateException("AudioTrack write failed: " + written);
            }
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        } catch (Exception error) {
            for (String layerId : new ArrayList<>(voices.keySet())) {
                errorListener.onGeneratorError(layerId, error.getMessage() == null ? "Generator playback failed" : error.getMessage());
            }
            playing = false;
        } finally {
            if (audioTrack != null) {
                try {
                    audioTrack.pause();
                    audioTrack.flush();
                    audioTrack.release();
                } catch (IllegalStateException ignored) {}
                audioTrack = null;
            }
            synchronized (monitor) {
                if (Thread.currentThread() == thread) thread = null;
            }
        }
    }

    private AudioTrack createAudioTrack() {
        int minimumBuffer = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT);
        int bufferSize = Math.max(minimumBuffer * 2, FRAMES_PER_WRITE * 2 * Short.BYTES * 4);
        AudioTrack.Builder builder = new AudioTrack.Builder()
            .setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                new AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setPerformanceMode(AudioTrack.PERFORMANCE_MODE_POWER_SAVING);
        }
        return builder.build();
    }

    private void render(short[] samples) {
        List<Voice> current = new ArrayList<>(voices.values());
        for (int frame = 0; frame < FRAMES_PER_WRITE; frame++) {
            double left = 0;
            double right = 0;
            for (Voice voice : current) {
                voice.advanceGain();
                if (voice.gain <= 0.000001 && voice.removeWhenSilent && voice.rampFramesRemaining == 0) {
                    voices.remove(voice.id, voice);
                    continue;
                }

                if ("binaural".equals(voice.generator)) {
                    double halfBeat = voice.beatFrequency / 2;
                    voice.leftPhase = wrap(voice.leftPhase + TWO_PI * (voice.baseFrequency - halfBeat) / sampleRate);
                    voice.rightPhase = wrap(voice.rightPhase + TWO_PI * (voice.baseFrequency + halfBeat) / sampleRate);
                    left += Math.sin(voice.leftPhase) * voice.gain;
                    right += Math.sin(voice.rightPhase) * voice.gain;
                } else {
                    voice.carrierPhase = wrap(voice.carrierPhase + TWO_PI * voice.baseFrequency / sampleRate);
                    voice.modulatorPhase = wrap(voice.modulatorPhase + TWO_PI * voice.beatFrequency / sampleRate);
                    // A steep, continuous gate keeps the isochronic pulse distinct without clicks.
                    double gate = (1 + Math.tanh(6 * Math.sin(voice.modulatorPhase))) / 2;
                    double value = Math.sin(voice.carrierPhase) * gate * voice.gain;
                    left += value;
                    right += value;
                }
            }
            samples[frame * 2] = toPcm(left);
            samples[frame * 2 + 1] = toPcm(right);
        }
    }

    private int rampFrames(long transitionMs) {
        long frames = transitionMs * sampleRate / 1000;
        return (int) Math.min(Integer.MAX_VALUE, Math.max(0, frames));
    }

    private void wakeThread() {
        synchronized (monitor) {
            monitor.notifyAll();
        }
    }

    private static double wrap(double phase) {
        return phase >= TWO_PI ? phase - TWO_PI : phase;
    }

    private static short toPcm(double value) {
        double clamped = Math.max(-1, Math.min(1, value));
        return (short) Math.round(clamped * Short.MAX_VALUE);
    }

    private static final class Voice {
        final String id;
        volatile String generator = "binaural";
        volatile double baseFrequency = 100;
        volatile double beatFrequency = 10;
        volatile double layerVolume;
        volatile double targetGain;
        volatile int rampFramesRemaining;
        volatile boolean removeWhenSilent;

        double gain;
        double leftPhase;
        double rightPhase;
        double carrierPhase;
        double modulatorPhase;

        Voice(String id) {
            this.id = id;
        }

        void setTarget(double target, int frames) {
            if (frames == 0) gain = target;
            targetGain = target;
            rampFramesRemaining = frames;
        }

        void advanceGain() {
            int remaining = rampFramesRemaining;
            if (remaining <= 0) {
                gain = targetGain;
                return;
            }
            gain += (targetGain - gain) / remaining;
            rampFramesRemaining = remaining - 1;
        }
    }
}
