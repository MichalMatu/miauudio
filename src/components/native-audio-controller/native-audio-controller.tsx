import { useCallback, useEffect, useRef, useState } from 'react';

import { IS_NATIVE_APP } from '@/constants/app';
import { useSnackbar } from '@/contexts/snackbar';
import {
  applyMix,
  getState,
  onNativeAudioLayerError,
  onNativeAudioStateChanged,
  type ApplyMixOptions,
  type NativeAudioState,
} from '@/lib/native-audio';
import {
  clampNativeAudioVolume,
  createNativeAudioLayers,
  createNativeMixFingerprint,
  isCurrentNativeCommandState,
  isNewerNativeState,
} from '@/lib/native-audio-state';
import { useGeneratorStore } from '@/stores/generator';
import { useSettingsStore } from '@/stores/settings';
import { useSleepTimerStore } from '@/stores/sleep-timer';
import { useSoundStore } from '@/stores/sound';

import type { SoundDefinition } from '@/data/types';

const APPLY_DEBOUNCE_MS = 30;
const APPLY_RETRY_BASE_MS = 250;
const MAX_APPLY_RETRIES = 2;
const CONNECT_RETRY_BASE_MS = 250;
const MAX_CONNECT_RETRIES = 2;
const DEFAULT_TRANSITION_MS = 250;

export interface NativeAudioControllerProps {
  ready: boolean;
  sounds: ReadonlyArray<SoundDefinition>;
}

function createClientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

interface SubmittedMix {
  fingerprint: string;
  playWhenReady: boolean;
  requestId: string;
}

export function NativeAudioController({
  ready,
  sounds,
}: NativeAudioControllerProps) {
  const showSnackbar = useSnackbar();
  const [applyRetryRevision, setApplyRetryRevision] = useState(0);
  const [connected, setConnected] = useState(false);

  const soundState = useSoundStore(state => state.sounds);
  const isPlaying = useSoundStore(state => state.isPlaying);
  const generatorSettings = useGeneratorStore(state => state.settings);
  const masterVolume = useSettingsStore(state => state.globalVolume);

  const clientIdRef = useRef(createClientId());
  const requestSequenceRef = useRef(0);
  const latestRequestIdRef = useRef<string | null>(null);
  const latestRequestTransportRevisionRef = useRef(0);
  const acknowledgedTransportRevisionRef = useRef(0);
  const latestNativeStateRef = useRef<{
    sequence: number;
    sessionId: string;
  } | null>(null);
  const definitionsRef = useRef(sounds);
  const mountedRef = useRef(true);
  const pendingApplyRef = useRef<ApplyMixOptions | null>(null);
  const applyingRef = useRef(false);
  const applyErrorShownRef = useRef(false);
  const applyRetryAttemptsRef = useRef(0);
  const applyRetryKeyRef = useRef<string | null>(null);
  const applyRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastSubmittedMixRef = useRef<SubmittedMix | null>(null);
  const transportIntentRevisionRef = useRef(0);
  const nativeTransportUpdateRef = useRef(false);

  definitionsRef.current = sounds;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (applyRetryTimeoutRef.current) {
        clearTimeout(applyRetryTimeoutRef.current);
        applyRetryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(
    () =>
      useSoundStore.subscribe((state, previousState) => {
        if (
          !nativeTransportUpdateRef.current &&
          state.isPlaying !== previousState.isPlaying
        ) {
          transportIntentRevisionRef.current += 1;
        }
      }),
    [],
  );

  const synchronizeNativeState = useCallback(
    (state: NativeAudioState, synchronizeTransport = true) => {
      const latestState = latestNativeStateRef.current;

      if (!isNewerNativeState(latestState, state)) return;

      latestNativeStateRef.current = {
        sequence: state.sequence,
        sessionId: state.sessionId,
      };

      if (!isCurrentNativeCommandState(state, latestRequestIdRef.current)) {
        return;
      }

      if (
        state.reason === 'command' &&
        state.requestId !== null &&
        state.requestId === latestRequestIdRef.current
      ) {
        acknowledgedTransportRevisionRef.current =
          latestRequestTransportRevisionRef.current;
      }

      useSleepTimerStore.getState().synchronize(state.timerEndsAt);
      if (!synchronizeTransport) return;
      if (
        (state.reason === 'command' || state.reason === 'service') &&
        acknowledgedTransportRevisionRef.current !==
          transportIntentRevisionRef.current
      ) {
        return;
      }

      const store = useSoundStore.getState();
      const canPlay = state.playWhenReady && !store.noSelected();

      if (canPlay !== store.isPlaying) {
        if (state.reason !== 'command' && state.reason !== 'service') {
          transportIntentRevisionRef.current += 1;
        }
        nativeTransportUpdateRef.current = true;
        try {
          if (canPlay) store.play();
          else store.pause();
        } finally {
          nativeTransportUpdateRef.current = false;
        }
      }
    },
    [],
  );

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
          applyRetryAttemptsRef.current = 0;
          if (applyRetryTimeoutRef.current) {
            clearTimeout(applyRetryTimeoutRef.current);
            applyRetryTimeoutRef.current = null;
          }
          synchronizeNativeState(state);
        }
      } catch {
        if (lastSubmittedMixRef.current?.requestId === options.requestId) {
          lastSubmittedMixRef.current = null;
          if (
            mountedRef.current &&
            applyRetryAttemptsRef.current < MAX_APPLY_RETRIES
          ) {
            applyRetryAttemptsRef.current += 1;
            const retryKey = applyRetryKeyRef.current;
            const delay =
              APPLY_RETRY_BASE_MS * 2 ** (applyRetryAttemptsRef.current - 1);
            if (applyRetryTimeoutRef.current) {
              clearTimeout(applyRetryTimeoutRef.current);
            }
            applyRetryTimeoutRef.current = setTimeout(() => {
              applyRetryTimeoutRef.current = null;
              if (mountedRef.current && retryKey === applyRetryKeyRef.current) {
                setApplyRetryRevision(revision => revision + 1);
              }
            }, delay);
          }
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
    let connectRetryTimeout: ReturnType<typeof setTimeout> | null = null;
    let retriesScheduled = 0;
    const activeAttempts = new Set<symbol>();
    const listenerHandles = new Set<{ remove: () => Promise<void> }>();
    const transportRevisionAtConnectionStart =
      transportIntentRevisionRef.current;

    setConnected(false);
    pendingApplyRef.current = null;
    lastSubmittedMixRef.current = null;
    latestNativeStateRef.current = null;
    applyRetryAttemptsRef.current = 0;
    applyRetryKeyRef.current = null;
    if (applyRetryTimeoutRef.current) {
      clearTimeout(applyRetryTimeoutRef.current);
      applyRetryTimeoutRef.current = null;
    }

    const removeListenerHandles = async (
      handles: ReadonlyArray<{ remove: () => Promise<void> }>,
    ) => {
      const removals = handles.flatMap(handle => {
        if (!listenerHandles.delete(handle)) return [];

        return [Promise.resolve().then(() => handle.remove())];
      });

      await Promise.allSettled(removals);
    };

    const connect = async () => {
      const attempt = Symbol('native-audio-connect');
      const attemptHandles: Array<{ remove: () => Promise<void> }> = [];
      activeAttempts.add(attempt);

      const attemptIsActive = () => !disposed && activeAttempts.has(attempt);

      const registerHandle = (handle: { remove: () => Promise<void> }) => {
        attemptHandles.push(handle);
        listenerHandles.add(handle);
      };

      try {
        const stateListener = await onNativeAudioStateChanged(state => {
          if (attemptIsActive()) synchronizeNativeState(state);
        });
        registerHandle(stateListener);
        if (!attemptIsActive()) {
          await removeListenerHandles(attemptHandles);
          return;
        }

        const errorListener = await onNativeAudioLayerError(error => {
          if (!attemptIsActive()) return;

          const store = useSoundStore.getState();
          store.unselect(error.layerId);
          if (store.noSelected()) store.pause();

          const label = definitionsRef.current.find(
            sound => sound.id === error.layerId,
          )?.label;

          showSnackbar(
            label ? `Could not play ${label}.` : 'A sound could not be played.',
          );
        });
        registerHandle(errorListener);
        if (!attemptIsActive()) {
          await removeListenerHandles(attemptHandles);
          return;
        }

        const state = await getState();
        if (!attemptIsActive()) {
          await removeListenerHandles(attemptHandles);
          return;
        }

        synchronizeNativeState(
          state,
          transportIntentRevisionRef.current ===
            transportRevisionAtConnectionStart,
        );
        // A snapshot exposes active IDs, but not source, volume, or generator
        // settings. Reapply the complete UI mix after every reconnect so equal
        // IDs cannot hide stale native configuration.
        lastSubmittedMixRef.current = null;
        setConnected(true);
      } catch {
        activeAttempts.delete(attempt);
        await removeListenerHandles(attemptHandles);
        if (disposed) return;

        setConnected(false);
        if (retriesScheduled < MAX_CONNECT_RETRIES) {
          const delay = CONNECT_RETRY_BASE_MS * 2 ** retriesScheduled;
          retriesScheduled += 1;
          connectRetryTimeout = setTimeout(() => {
            connectRetryTimeout = null;
            if (!disposed) void connect();
          }, delay);
        } else {
          showSnackbar('Native audio service is not available.');
        }
      }
    };

    void connect();

    return () => {
      disposed = true;
      activeAttempts.clear();
      if (connectRetryTimeout) clearTimeout(connectRetryTimeout);
      pendingApplyRef.current = null;
      void removeListenerHandles([...listenerHandles]);
    };
  }, [ready, showSnackbar, synchronizeNativeState]);

  useEffect(() => {
    if (!IS_NATIVE_APP || !ready || !connected) return;

    const layers = createNativeAudioLayers(
      sounds,
      soundState,
      generatorSettings,
    );

    const normalizedMasterVolume = clampNativeAudioVolume(masterVolume);
    const playWhenReady = isPlaying && layers.length > 0;
    const fingerprint = createNativeMixFingerprint(
      layers,
      normalizedMasterVolume,
    );
    const retryKey = JSON.stringify({ fingerprint, playWhenReady });
    if (retryKey !== applyRetryKeyRef.current) {
      applyRetryKeyRef.current = retryKey;
      applyRetryAttemptsRef.current = 0;
      if (applyRetryTimeoutRef.current) {
        clearTimeout(applyRetryTimeoutRef.current);
        applyRetryTimeoutRef.current = null;
      }
    }

    if (
      lastSubmittedMixRef.current?.fingerprint === fingerprint &&
      lastSubmittedMixRef.current.playWhenReady === playWhenReady
    ) {
      return;
    }

    const requestId = `${clientIdRef.current}:${++requestSequenceRef.current}`;
    const transportRevision = transportIntentRevisionRef.current;

    const options: ApplyMixOptions = {
      layers,
      masterVolume: normalizedMasterVolume,
      playWhenReady,
      requestId,
      transitionMs: DEFAULT_TRANSITION_MS,
    };

    const timeout = setTimeout(() => {
      latestRequestIdRef.current = requestId;
      latestRequestTransportRevisionRef.current = transportRevision;
      lastSubmittedMixRef.current = {
        fingerprint,
        playWhenReady,
        requestId,
      };
      enqueueApply(options);
    }, APPLY_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [
    applyRetryRevision,
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
