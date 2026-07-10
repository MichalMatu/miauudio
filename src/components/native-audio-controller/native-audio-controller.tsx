import { useCallback, useEffect, useRef, useState } from 'react';

import { IS_NATIVE_APP } from '@/constants/app';
import { useSnackbar } from '@/contexts/snackbar';
import {
  applyMix,
  getState,
  onNativeAudioLayerError,
  onNativeAudioStateChanged,
  type ApplyMixOptions,
  type NativeAudioLayer,
  type NativeAudioState,
} from '@/lib/native-audio';
import { useGeneratorStore } from '@/stores/generator';
import { useSettingsStore } from '@/stores/settings';
import { useSleepTimerStore } from '@/stores/sleep-timer';
import { useSoundStore, type SoundValue } from '@/stores/sound';

import type { SoundDefinition } from '@/data/types';
import type { GeneratorSettingsSnapshot } from '@/stores/generator';

const APPLY_DEBOUNCE_MS = 30;
const DEFAULT_TRANSITION_MS = 250;

export interface NativeAudioControllerProps {
  ready: boolean;
  sounds: ReadonlyArray<SoundDefinition>;
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 0.5;

  return Math.min(1, Math.max(0, value));
}

function normalizeAssetPath(path: string) {
  return path.replace(/^\/+/, '');
}

export function createNativeAudioLayers(
  definitions: ReadonlyArray<SoundDefinition>,
  soundState: Record<string, SoundValue>,
  generatorSettings: GeneratorSettingsSnapshot,
) {
  return definitions.flatMap<NativeAudioLayer>(definition => {
    const state = soundState[definition.id];
    if (!state?.isSelected) return [];

    const volume = clampVolume(state.volume);

    if (definition.kind === 'generator') {
      const settings = generatorSettings[definition.generator];

      return [
        {
          generator: definition.generator,
          id: definition.id,
          kind: 'generator',
          settings: {
            baseFrequency: settings.baseFrequency,
            beatFrequency: settings.beatFrequency,
          },
          volume,
        },
      ];
    }

    const source =
      definition.source.kind === 'asset'
        ? {
            kind: 'asset' as const,
            path: normalizeAssetPath(definition.source.path),
          }
        : definition.source;

    return [
      {
        id: definition.id,
        kind: 'file',
        loop: true,
        source,
        volume,
      },
    ];
  });
}

function createClientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createMixFingerprint(
  layers: ReadonlyArray<NativeAudioLayer>,
  masterVolume: number,
) {
  return JSON.stringify({ layers, masterVolume });
}

function hasSameLayerIds(
  layers: ReadonlyArray<NativeAudioLayer>,
  activeLayerIds: ReadonlyArray<string>,
) {
  if (layers.length !== activeLayerIds.length) return false;

  const activeIds = new Set(activeLayerIds);
  return layers.every(layer => activeIds.has(layer.id));
}

interface SubmittedMix {
  fingerprint: string;
  playWhenReady: boolean;
  requestId: string;
}

interface NativeTransportEcho {
  fingerprint: string;
  playWhenReady: boolean;
}

export function NativeAudioController({
  ready,
  sounds,
}: NativeAudioControllerProps) {
  const showSnackbar = useSnackbar();
  const [connected, setConnected] = useState(false);

  const soundState = useSoundStore(state => state.sounds);
  const isPlaying = useSoundStore(state => state.isPlaying);
  const generatorSettings = useGeneratorStore(state => state.settings);
  const masterVolume = useSettingsStore(state => state.globalVolume);

  const clientIdRef = useRef(createClientId());
  const requestSequenceRef = useRef(0);
  const latestRequestIdRef = useRef<string | null>(null);
  const latestNativeStateRef = useRef<{
    sequence: number;
    sessionId: string;
  } | null>(null);
  const definitionsRef = useRef(sounds);
  const mountedRef = useRef(true);
  const pendingApplyRef = useRef<ApplyMixOptions | null>(null);
  const applyingRef = useRef(false);
  const applyErrorShownRef = useRef(false);
  const lastSubmittedMixRef = useRef<SubmittedMix | null>(null);
  const nativeTransportEchoRef = useRef<NativeTransportEcho | null>(null);

  definitionsRef.current = sounds;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const synchronizeNativeState = useCallback((state: NativeAudioState) => {
    const latestState = latestNativeStateRef.current;

    if (
      latestState?.sessionId === state.sessionId &&
      state.sequence <= latestState.sequence
    ) {
      return;
    }

    latestNativeStateRef.current = {
      sequence: state.sequence,
      sessionId: state.sessionId,
    };

    if (
      state.reason === 'command' &&
      state.requestId &&
      latestRequestIdRef.current &&
      state.requestId !== latestRequestIdRef.current
    ) {
      return;
    }

    useSleepTimerStore.getState().synchronize(state.timerEndsAt);

    const store = useSoundStore.getState();
    const canPlay = state.playWhenReady && !store.noSelected();

    if (canPlay !== store.isPlaying) {
      const layers = createNativeAudioLayers(
        definitionsRef.current,
        store.sounds,
        useGeneratorStore.getState().settings,
      );
      const fingerprint = createMixFingerprint(
        layers,
        clampVolume(useSettingsStore.getState().globalVolume),
      );

      if (lastSubmittedMixRef.current?.fingerprint === fingerprint) {
        nativeTransportEchoRef.current = {
          fingerprint,
          playWhenReady: canPlay,
        };
        pendingApplyRef.current = null;
      }

      if (canPlay) store.play();
      else store.pause();
    }
  }, []);

  const drainApplyQueue = useCallback(async () => {
    if (applyingRef.current) return;

    applyingRef.current = true;

    while (mountedRef.current && pendingApplyRef.current) {
      const options = pendingApplyRef.current;
      pendingApplyRef.current = null;

      try {
        const state = await applyMix(options);
        applyErrorShownRef.current = false;

        if (options.requestId === latestRequestIdRef.current) {
          synchronizeNativeState(state);
        }
      } catch {
        if (lastSubmittedMixRef.current?.requestId === options.requestId) {
          lastSubmittedMixRef.current = null;
        }
        if (!applyErrorShownRef.current) {
          applyErrorShownRef.current = true;
          showSnackbar('Could not update native audio playback.');
        }
      }
    }

    applyingRef.current = false;
  }, [showSnackbar, synchronizeNativeState]);

  const enqueueApply = useCallback(
    (options: ApplyMixOptions) => {
      pendingApplyRef.current = options;
      void drainApplyQueue();
    },
    [drainApplyQueue],
  );

  useEffect(() => {
    if (!IS_NATIVE_APP || !ready) return;

    let disposed = false;
    const listenerHandles: Array<{ remove: () => Promise<void> }> = [];

    setConnected(false);
    pendingApplyRef.current = null;
    lastSubmittedMixRef.current = null;
    nativeTransportEchoRef.current = null;
    latestNativeStateRef.current = null;

    const connect = async () => {
      try {
        const [stateListener, errorListener] = await Promise.all([
          onNativeAudioStateChanged(synchronizeNativeState),
          onNativeAudioLayerError(error => {
            const store = useSoundStore.getState();
            store.unselect(error.layerId);
            if (store.noSelected()) store.pause();

            const label = definitionsRef.current.find(
              sound => sound.id === error.layerId,
            )?.label;

            showSnackbar(
              label
                ? `Could not play ${label}.`
                : 'A sound could not be played.',
            );
          }),
        ]);

        if (disposed) {
          await Promise.all([stateListener.remove(), errorListener.remove()]);
          return;
        }

        listenerHandles.push(stateListener, errorListener);

        const state = await getState();
        if (disposed) return;

        synchronizeNativeState(state);
        const store = useSoundStore.getState();
        const layers = createNativeAudioLayers(
          definitionsRef.current,
          store.sounds,
          useGeneratorStore.getState().settings,
        );
        const fingerprint = createMixFingerprint(
          layers,
          clampVolume(useSettingsStore.getState().globalVolume),
        );

        lastSubmittedMixRef.current = hasSameLayerIds(
          layers,
          state.activeLayerIds,
        )
          ? {
              fingerprint,
              playWhenReady: state.playWhenReady && layers.length > 0,
              requestId: state.requestId ?? 'native-session',
            }
          : null;
        setConnected(true);
      } catch {
        if (!disposed) {
          showSnackbar('Native audio service is not available.');
        }
      }
    };

    void connect();

    return () => {
      disposed = true;
      pendingApplyRef.current = null;
      listenerHandles.forEach(handle => void handle.remove());
    };
  }, [ready, showSnackbar, synchronizeNativeState]);

  useEffect(() => {
    if (!IS_NATIVE_APP || !ready || !connected) return;

    const layers = createNativeAudioLayers(
      sounds,
      soundState,
      generatorSettings,
    );

    const normalizedMasterVolume = clampVolume(masterVolume);
    const playWhenReady = isPlaying && layers.length > 0;
    const fingerprint = createMixFingerprint(layers, normalizedMasterVolume);
    const transportEcho = nativeTransportEchoRef.current;

    if (
      transportEcho?.fingerprint === fingerprint &&
      transportEcho.playWhenReady === playWhenReady
    ) {
      nativeTransportEchoRef.current = null;
      lastSubmittedMixRef.current = {
        fingerprint,
        playWhenReady,
        requestId:
          lastSubmittedMixRef.current?.requestId ??
          latestRequestIdRef.current ??
          'native-transport',
      };
      return;
    }

    nativeTransportEchoRef.current = null;

    if (
      lastSubmittedMixRef.current?.fingerprint === fingerprint &&
      lastSubmittedMixRef.current.playWhenReady === playWhenReady
    ) {
      return;
    }

    const requestId = `${clientIdRef.current}:${++requestSequenceRef.current}`;

    const options: ApplyMixOptions = {
      layers,
      masterVolume: normalizedMasterVolume,
      playWhenReady,
      requestId,
      transitionMs: DEFAULT_TRANSITION_MS,
    };

    const timeout = setTimeout(() => {
      latestRequestIdRef.current = requestId;
      lastSubmittedMixRef.current = {
        fingerprint,
        playWhenReady,
        requestId,
      };
      enqueueApply(options);
    }, APPLY_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [
    connected,
    enqueueApply,
    generatorSettings,
    isPlaying,
    masterVolume,
    ready,
    soundState,
    sounds,
  ]);

  return null;
}
