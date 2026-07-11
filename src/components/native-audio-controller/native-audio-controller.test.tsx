// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SoundDefinition } from '@/data/types';
import type {
  ApplyMixOptions,
  NativeAudioState,
  NativeAudioStateReason,
} from '@/lib/native-audio';
import { useGeneratorStore } from '@/stores/generator';
import { useSettingsStore } from '@/stores/settings';
import { useSleepTimerStore } from '@/stores/sleep-timer';
import { useSoundStore } from '@/stores/sound';

const nativeMocks = vi.hoisted(() => ({
  applyMix: vi.fn(),
  getState: vi.fn(),
  layerErrorListener: null as ((error: unknown) => void) | null,
  onLayerError: vi.fn(),
  onStateChanged: vi.fn(),
  showSnackbar: vi.fn(),
  stateListener: null as ((state: NativeAudioState) => void) | null,
}));

vi.mock('@/constants/app', () => ({ IS_NATIVE_APP: true }));
vi.mock('@/contexts/snackbar', () => ({
  useSnackbar: () => nativeMocks.showSnackbar,
}));
vi.mock('@/lib/native-audio', () => ({
  applyMix: nativeMocks.applyMix,
  getState: nativeMocks.getState,
  onNativeAudioLayerError: nativeMocks.onLayerError,
  onNativeAudioStateChanged: nativeMocks.onStateChanged,
}));

import { NativeAudioController } from './native-audio-controller';

const rain: SoundDefinition = {
  icon: 'BsFillCloudRainFill',
  id: 'light-rain',
  kind: 'file',
  label: 'Light Rain',
  origin: 'bundled',
  playback: { kind: 'loop' },
  source: { kind: 'asset', path: '/sounds/rain/light-rain.mp3' },
};

const initialSounds = structuredClone(useSoundStore.getState().sounds);
const initialGeneratorSettings = structuredClone(
  useGeneratorStore.getState().settings,
);

function nativeState(
  overrides: Partial<NativeAudioState> = {},
): NativeAudioState {
  return {
    activeLayerIds: ['light-rain'],
    playbackState: 'ready',
    playWhenReady: false,
    reason: 'service',
    requestId: null,
    sequence: 1,
    sessionId: 'session-a',
    timerEndsAt: null,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function selectRain(volume = 0.5, playing = false) {
  const store = useSoundStore.getState();
  store.select(rain.id);
  store.setVolume(rain.id, volume);
  if (playing) store.play();
}

beforeEach(() => {
  localStorage.clear();
  nativeMocks.stateListener = null;
  nativeMocks.layerErrorListener = null;

  useSoundStore.setState({
    history: null,
    isPlaying: false,
    locked: false,
    sounds: structuredClone(initialSounds),
  });
  useGeneratorStore.setState({
    settings: structuredClone(initialGeneratorSettings),
  });
  useSettingsStore.setState({ alarmVolume: 1, globalVolume: 1 });
  useSleepTimerStore.setState({ endsAt: null, startedAt: null });

  nativeMocks.onStateChanged.mockImplementation(async listener => {
    nativeMocks.stateListener = listener;
    return { remove: vi.fn().mockResolvedValue(undefined) };
  });
  nativeMocks.onLayerError.mockImplementation(async listener => {
    nativeMocks.layerErrorListener = listener;
    return { remove: vi.fn().mockResolvedValue(undefined) };
  });
  nativeMocks.getState.mockResolvedValue(nativeState());
  nativeMocks.applyMix.mockImplementation((options: ApplyMixOptions) =>
    Promise.resolve(
      nativeState({
        activeLayerIds: options.layers.map(layer => layer.id),
        playWhenReady: options.playWhenReady,
        reason: 'command',
        requestId: options.requestId,
        sequence: 10,
      }),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NativeAudioController synchronization', () => {
  it('reapplies the complete mix after reconnect even when layer IDs match', async () => {
    selectRain(0.35);
    useSettingsStore.getState().setGlobalVolume(0.8);
    nativeMocks.getState.mockResolvedValue(
      nativeState({ activeLayerIds: [rain.id] }),
    );

    render(<NativeAudioController ready sounds={[rain]} />);

    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));
    expect(nativeMocks.applyMix).toHaveBeenCalledWith(
      expect.objectContaining({
        layers: [expect.objectContaining({ id: rain.id, volume: 0.35 })],
        masterVolume: 0.8,
      }),
    );
  });

  it('keeps the newest mix when a media event arrives during an older apply', async () => {
    selectRain(0.4, true);
    nativeMocks.getState.mockResolvedValue(
      nativeState({ playWhenReady: true }),
    );
    const firstApply = deferred<NativeAudioState>();
    nativeMocks.applyMix
      .mockImplementationOnce(() => firstApply.promise)
      .mockImplementationOnce((options: ApplyMixOptions) =>
        Promise.resolve(
          nativeState({
            activeLayerIds: options.layers.map(layer => layer.id),
            playWhenReady: options.playWhenReady,
            reason: 'command',
            requestId: options.requestId,
            sequence: 4,
          }),
        ),
      );

    render(<NativeAudioController ready sounds={[rain]} />);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));

    act(() => useSoundStore.getState().setVolume(rain.id, 0.8));
    await new Promise(resolve => setTimeout(resolve, 60));

    act(() => {
      nativeMocks.stateListener?.(
        nativeState({
          playWhenReady: false,
          reason: 'media-button',
          sequence: 2,
        }),
      );
    });
    await new Promise(resolve => setTimeout(resolve, 60));

    const firstOptions = nativeMocks.applyMix.mock
      .calls[0][0] as ApplyMixOptions;
    firstApply.resolve(
      nativeState({
        playWhenReady: true,
        reason: 'command',
        requestId: firstOptions.requestId,
        sequence: 3,
      }),
    );

    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(2));
    const latest = nativeMocks.applyMix.mock.calls[1][0] as ApplyMixOptions;
    expect(latest.layers[0]).toEqual(expect.objectContaining({ volume: 0.8 }));
    expect(latest.playWhenReady).toBe(false);
  });

  it('does not overwrite a local Play action made during startup', async () => {
    selectRain(0.5, false);
    const initialState = deferred<NativeAudioState>();
    nativeMocks.getState.mockReturnValue(initialState.promise);

    render(<NativeAudioController ready sounds={[rain]} />);
    act(() => useSoundStore.getState().play());
    initialState.resolve(nativeState({ playWhenReady: false }));

    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));
    const submitted = nativeMocks.applyMix.mock.calls[0][0] as ApplyMixOptions;
    expect(submitted.playWhenReady).toBe(true);
  });

  it('does not let an old command cancel a fresh local Play debounce', async () => {
    selectRain(0.5, false);

    render(<NativeAudioController ready sounds={[rain]} />);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));

    const oldRequest = nativeMocks.applyMix.mock.calls[0][0] as ApplyMixOptions;
    act(() => useSoundStore.getState().play());
    act(() => {
      nativeMocks.stateListener?.(
        nativeState({
          playWhenReady: false,
          reason: 'command',
          requestId: oldRequest.requestId,
          sequence: 11,
        }),
      );
    });

    expect(useSoundStore.getState().isPlaying).toBe(true);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(2));
    expect(
      (nativeMocks.applyMix.mock.calls[1][0] as ApplyMixOptions).playWhenReady,
    ).toBe(true);
  });

  it('does not let a passive service state cancel Play before debounce', async () => {
    selectRain(0.5, false);

    render(<NativeAudioController ready sounds={[rain]} />);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));

    const oldRequest = nativeMocks.applyMix.mock.calls[0][0] as ApplyMixOptions;
    act(() => useSoundStore.getState().play());
    act(() => {
      nativeMocks.stateListener?.(
        nativeState({
          playWhenReady: false,
          reason: 'service',
          requestId: oldRequest.requestId,
          sequence: 11,
        }),
      );
    });

    expect(useSoundStore.getState().isPlaying).toBe(true);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(2));
    expect(
      (nativeMocks.applyMix.mock.calls[1][0] as ApplyMixOptions).playWhenReady,
    ).toBe(true);
  });

  it('ignores an old service state after debounce until the new mix is acknowledged', async () => {
    selectRain(0.5, false);

    render(<NativeAudioController ready sounds={[rain]} />);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));
    const oldRequest = nativeMocks.applyMix.mock.calls[0][0] as ApplyMixOptions;
    const pendingApply = deferred<NativeAudioState>();
    nativeMocks.applyMix.mockImplementationOnce(() => pendingApply.promise);

    act(() => useSoundStore.getState().play());
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(2));
    const newRequest = nativeMocks.applyMix.mock.calls[1][0] as ApplyMixOptions;

    act(() => {
      nativeMocks.stateListener?.(
        nativeState({
          playWhenReady: false,
          reason: 'service',
          requestId: oldRequest.requestId,
          sequence: 11,
        }),
      );
    });
    expect(useSoundStore.getState().isPlaying).toBe(true);

    pendingApply.resolve(
      nativeState({
        playWhenReady: true,
        reason: 'command',
        requestId: newRequest.requestId,
        sequence: 12,
      }),
    );
    await act(async () => {
      await pendingApply.promise;
    });

    act(() => {
      nativeMocks.stateListener?.(
        nativeState({
          playWhenReady: false,
          reason: 'service',
          requestId: newRequest.requestId,
          sequence: 13,
        }),
      );
    });
    expect(useSoundStore.getState().isPlaying).toBe(false);
  });

  it.each([
    'media-button',
    'audio-focus',
    'timer',
    'headphones-disconnected',
  ] satisfies Array<NativeAudioStateReason>)('still accepts an external %s transport event', async reason => {
    selectRain(0.5, true);
    nativeMocks.getState.mockResolvedValue(
      nativeState({ playWhenReady: true }),
    );

    render(<NativeAudioController ready sounds={[rain]} />);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));

    act(() => {
      nativeMocks.stateListener?.(
        nativeState({
          playWhenReady: false,
          reason,
          requestId: 'an-older-local-request',
          sequence: 11,
        }),
      );
    });

    expect(useSoundStore.getState().isPlaying).toBe(false);
  });

  it('does not let a command response reverse an external event before debounce', async () => {
    selectRain(0.5, true);
    nativeMocks.getState.mockResolvedValue(
      nativeState({ playWhenReady: true }),
    );
    const pendingApply = deferred<NativeAudioState>();
    nativeMocks.applyMix.mockReturnValueOnce(pendingApply.promise);

    render(<NativeAudioController ready sounds={[rain]} />);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1));
    const oldRequest = nativeMocks.applyMix.mock.calls[0][0] as ApplyMixOptions;

    act(() => {
      nativeMocks.stateListener?.(
        nativeState({
          playWhenReady: false,
          reason: 'media-button',
          requestId: oldRequest.requestId,
          sequence: 2,
        }),
      );
    });
    pendingApply.resolve(
      nativeState({
        playWhenReady: true,
        reason: 'command',
        requestId: oldRequest.requestId,
        sequence: 3,
      }),
    );
    await act(async () => {
      await pendingApply.promise;
    });

    expect(useSoundStore.getState().isPlaying).toBe(false);
    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(2));
    expect(
      (nativeMocks.applyMix.mock.calls[1][0] as ApplyMixOptions).playWhenReady,
    ).toBe(false);
  });

  it('retries the latest mix after a transient apply failure', async () => {
    selectRain();
    nativeMocks.applyMix
      .mockRejectedValueOnce(new Error('service starting'))
      .mockImplementationOnce((options: ApplyMixOptions) =>
        Promise.resolve(
          nativeState({
            activeLayerIds: options.layers.map(layer => layer.id),
            reason: 'command',
            requestId: options.requestId,
            sequence: 2,
          }),
        ),
      );

    render(<NativeAudioController ready sounds={[rain]} />);

    await waitFor(() => expect(nativeMocks.applyMix).toHaveBeenCalledTimes(2), {
      timeout: 1_500,
    });
    expect(nativeMocks.showSnackbar).toHaveBeenCalledTimes(1);
    expect(nativeMocks.applyMix.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        layers: [expect.objectContaining({ id: rain.id })],
      }),
    );
  });

  it('cleans partial listeners and getState listeners before reconnecting', async () => {
    vi.useFakeTimers();
    selectRain();

    const firstStateRemove = vi.fn().mockResolvedValue(undefined);
    const secondStateRemove = vi.fn().mockResolvedValue(undefined);
    const secondErrorRemove = vi.fn().mockResolvedValue(undefined);
    const thirdStateRemove = vi.fn().mockResolvedValue(undefined);
    const thirdErrorRemove = vi.fn().mockResolvedValue(undefined);

    nativeMocks.onStateChanged
      .mockResolvedValueOnce({ remove: firstStateRemove })
      .mockResolvedValueOnce({ remove: secondStateRemove })
      .mockResolvedValueOnce({ remove: thirdStateRemove });
    nativeMocks.onLayerError
      .mockRejectedValueOnce(new Error('listener registration failed'))
      .mockResolvedValueOnce({ remove: secondErrorRemove })
      .mockResolvedValueOnce({ remove: thirdErrorRemove });
    nativeMocks.getState
      .mockRejectedValueOnce(new Error('snapshot failed'))
      .mockResolvedValueOnce(nativeState());

    const view = render(<NativeAudioController ready sounds={[rain]} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(firstStateRemove).toHaveBeenCalledTimes(1);
    expect(nativeMocks.getState).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(secondStateRemove).toHaveBeenCalledTimes(1);
    expect(secondErrorRemove).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30);
    });

    expect(nativeMocks.onStateChanged).toHaveBeenCalledTimes(3);
    expect(nativeMocks.onLayerError).toHaveBeenCalledTimes(3);
    expect(nativeMocks.getState).toHaveBeenCalledTimes(2);
    expect(nativeMocks.applyMix).toHaveBeenCalledTimes(1);
    expect(nativeMocks.showSnackbar).not.toHaveBeenCalled();

    view.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(thirdStateRemove).toHaveBeenCalledTimes(1);
    expect(thirdErrorRemove).toHaveBeenCalledTimes(1);
  });

  it('stops reconnecting after the bounded retry budget', async () => {
    vi.useFakeTimers();
    nativeMocks.onStateChanged.mockRejectedValue(
      new Error('native bridge unavailable'),
    );

    render(<NativeAudioController ready sounds={[rain]} />);
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(nativeMocks.onStateChanged).toHaveBeenCalledTimes(3);
    expect(nativeMocks.showSnackbar).toHaveBeenCalledTimes(1);
    expect(nativeMocks.showSnackbar).toHaveBeenCalledWith(
      'Native audio service is not available.',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(nativeMocks.onStateChanged).toHaveBeenCalledTimes(3);
  });
});
