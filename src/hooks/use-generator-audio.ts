import { useCallback, useEffect, useMemo, useRef } from 'react';

import { FADE_OUT } from '@/constants/events';
import { subscribe } from '@/lib/event';
import {
  useGeneratorStore,
  type GeneratorId,
  type GeneratorSettings,
} from '@/stores/generator';

const DEFAULT_FADE_DURATION = 250;
const PARAMETER_RAMP_TIME = 0.015;

interface GeneratorEngine {
  context: AudioContext;
  oscillators: Array<OscillatorNode>;
  output: GainNode;
  update: (settings: GeneratorSettings) => void;
}

export interface GeneratorAudioControls {
  fadeOut: (duration: number) => void;
  pause: (duration?: number) => void;
  play: () => void;
  stop: () => void;
}

function clampVolume(volume: number) {
  if (!Number.isFinite(volume)) return 0.5;
  return Math.min(Math.max(volume, 0), 1);
}

function getContextState(context: AudioContext) {
  return context.state;
}

function rampParameter(
  context: AudioContext,
  parameter: AudioParam,
  value: number,
) {
  const now = context.currentTime;

  parameter.cancelScheduledValues(now);
  parameter.setTargetAtTime(value, now, PARAMETER_RAMP_TIME);
}

function rampGain(engine: GeneratorEngine, value: number, duration: number) {
  const gain = engine.output.gain;
  const now = engine.context.currentTime;
  const currentValue = gain.value;

  gain.cancelScheduledValues(now);
  gain.setValueAtTime(currentValue, now);

  if (duration <= 0) {
    gain.setValueAtTime(value, now);
    return;
  }

  gain.linearRampToValueAtTime(value, now + duration / 1000);
}

function createBinauralEngine(
  context: AudioContext,
  output: GainNode,
  settings: GeneratorSettings,
): GeneratorEngine {
  const leftOscillator = context.createOscillator();
  const rightOscillator = context.createOscillator();
  const leftPanner = context.createStereoPanner();
  const rightPanner = context.createStereoPanner();

  leftOscillator.type = 'sine';
  rightOscillator.type = 'sine';
  leftPanner.pan.value = -1;
  rightPanner.pan.value = 1;

  const initialHalfBeat = settings.beatFrequency / 2;
  leftOscillator.frequency.value = settings.baseFrequency - initialHalfBeat;
  rightOscillator.frequency.value = settings.baseFrequency + initialHalfBeat;

  leftOscillator.connect(leftPanner).connect(output);
  rightOscillator.connect(rightPanner).connect(output);

  const update = (nextSettings: GeneratorSettings) => {
    const halfBeat = nextSettings.beatFrequency / 2;

    rampParameter(
      context,
      leftOscillator.frequency,
      nextSettings.baseFrequency - halfBeat,
    );
    rampParameter(
      context,
      rightOscillator.frequency,
      nextSettings.baseFrequency + halfBeat,
    );
  };

  leftOscillator.start();
  rightOscillator.start();

  return {
    context,
    oscillators: [leftOscillator, rightOscillator],
    output,
    update,
  };
}

function createIsochronicEngine(
  context: AudioContext,
  output: GainNode,
  settings: GeneratorSettings,
): GeneratorEngine {
  const carrier = context.createOscillator();
  const modulator = context.createOscillator();
  const pulseGain = context.createGain();
  const modulationDepth = context.createGain();

  carrier.type = 'sine';
  modulator.type = 'square';
  carrier.frequency.value = settings.baseFrequency;
  modulator.frequency.value = settings.beatFrequency;

  // A square oscillator ranges from -1 to 1. A base gain of 0.5 plus a
  // modulation depth of 0.5 keeps the resulting pulse strictly within 0..1.
  pulseGain.gain.value = 0.5;
  modulationDepth.gain.value = 0.5;

  modulator.connect(modulationDepth).connect(pulseGain.gain);
  carrier.connect(pulseGain).connect(output);

  const update = (nextSettings: GeneratorSettings) => {
    rampParameter(context, carrier.frequency, nextSettings.baseFrequency);
    rampParameter(context, modulator.frequency, nextSettings.beatFrequency);
  };

  carrier.start();
  modulator.start();

  return {
    context,
    oscillators: [carrier, modulator],
    output,
    update,
  };
}

function createGeneratorEngine(
  generator: GeneratorId,
  settings: GeneratorSettings,
) {
  const context = new window.AudioContext();
  const output = context.createGain();

  output.gain.value = 0;
  output.connect(context.destination);

  try {
    return generator === 'binaural'
      ? createBinauralEngine(context, output, settings)
      : createIsochronicEngine(context, output, settings);
  } catch (error) {
    if (context.state !== 'closed') void context.close();
    throw error;
  }
}

export function useGeneratorAudio(
  generator: GeneratorId,
  volume: number,
  onError?: (error: Error) => void,
): GeneratorAudioControls {
  const settings = useGeneratorStore(state => state.settings[generator]);
  const engineRef = useRef<GeneratorEngine | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFadingOutRef = useRef(false);
  const onErrorRef = useRef(onError);
  const requestedPlayingRef = useRef(false);
  const settingsRef = useRef(settings);
  const targetVolumeRef = useRef(clampVolume(volume));

  onErrorRef.current = onError;
  settingsRef.current = settings;
  targetVolumeRef.current = clampVolume(volume);

  const reportError = useCallback((error: unknown) => {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));

    onErrorRef.current?.(normalizedError);
  }, []);

  const clearFadeTimeout = useCallback(() => {
    if (!fadeTimeoutRef.current) return;

    clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = null;
  }, []);

  const disposeEngine = useCallback(() => {
    clearFadeTimeout();
    isFadingOutRef.current = false;
    requestedPlayingRef.current = false;

    const engine = engineRef.current;
    engineRef.current = null;

    if (!engine) return;

    engine.oscillators.forEach(oscillator => {
      try {
        oscillator.stop();
      } catch {
        // The engine may already have been stopped by the browser.
      }
    });

    engine.output.disconnect();

    if (engine.context.state !== 'closed') {
      void engine.context.close().catch(reportError);
    }
  }, [clearFadeTimeout, reportError]);

  const reconcileEngine = useCallback(
    async (engine: GeneratorEngine) => {
      try {
        while (
          engineRef.current === engine &&
          engine.context.state !== 'closed'
        ) {
          if (requestedPlayingRef.current) {
            if (engine.context.state !== 'running') {
              await engine.context.resume();
              if (getContextState(engine.context) !== 'running') return;
              continue;
            }

            if (!requestedPlayingRef.current) continue;

            rampGain(engine, targetVolumeRef.current, DEFAULT_FADE_DURATION);
            return;
          }

          // Keep the context running until the requested fade has completed.
          if (isFadingOutRef.current) return;

          if (engine.context.state === 'running') {
            await engine.context.suspend();
            if (getContextState(engine.context) === 'running') return;
            continue;
          }

          if (requestedPlayingRef.current || isFadingOutRef.current) continue;

          return;
        }
      } catch (error) {
        if (engineRef.current !== engine) return;

        disposeEngine();
        reportError(error);
      }
    },
    [disposeEngine, reportError],
  );

  const play = useCallback(() => {
    clearFadeTimeout();
    isFadingOutRef.current = false;
    requestedPlayingRef.current = true;

    let engine = engineRef.current;

    try {
      if (!engine || engine.context.state === 'closed') {
        engine = createGeneratorEngine(generator, settingsRef.current);
        engineRef.current = engine;
      }

      void reconcileEngine(engine);
    } catch (error) {
      disposeEngine();
      reportError(error);
    }
  }, [
    clearFadeTimeout,
    disposeEngine,
    generator,
    reconcileEngine,
    reportError,
  ]);

  const pause = useCallback(
    (duration: number = DEFAULT_FADE_DURATION) => {
      const engine = engineRef.current;
      if (!engine) return;

      const fadeDuration = Number.isFinite(duration)
        ? Math.max(duration, 0)
        : 0;

      clearFadeTimeout();
      isFadingOutRef.current = true;
      requestedPlayingRef.current = false;
      rampGain(engine, 0, fadeDuration);

      const suspend = () => {
        if (engineRef.current !== engine) return;
        if (requestedPlayingRef.current || !isFadingOutRef.current) return;

        fadeTimeoutRef.current = null;
        isFadingOutRef.current = false;
        void reconcileEngine(engine);
      };

      if (fadeDuration === 0) {
        suspend();
      } else {
        fadeTimeoutRef.current = setTimeout(suspend, fadeDuration);
      }
    },
    [clearFadeTimeout, reconcileEngine],
  );

  const stop = useCallback(() => {
    disposeEngine();
  }, [disposeEngine]);

  const fadeOut = useCallback(
    (duration: number) => {
      pause(duration);
    },
    [pause],
  );

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      engine.update(settings);
    } catch (error) {
      disposeEngine();
      reportError(error);
    }
  }, [settings, disposeEngine, reportError]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || isFadingOutRef.current) return;

    rampGain(engine, targetVolumeRef.current, DEFAULT_FADE_DURATION);
  }, [volume]);

  useEffect(() => {
    const listener = (event: { duration: number }) => fadeOut(event.duration);

    return subscribe(FADE_OUT, listener);
  }, [fadeOut]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || !requestedPlayingRef.current) return;

      const engine = engineRef.current;
      if (!engine || engine.context.state === 'running') return;
      if (engine.context.state === 'closed') return;

      void reconcileEngine(engine);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [reconcileEngine]);

  useEffect(() => disposeEngine, [disposeEngine, generator]);

  return useMemo(
    () => ({ fadeOut, pause, play, stop }),
    [fadeOut, pause, play, stop],
  );
}
