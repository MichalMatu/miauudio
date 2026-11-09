// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileSound } from '@/data/types';
import { useSoundStore } from '@/stores/sound';

const mocks = vi.hoisted(() => ({
  options: null as { onError?: () => void } | null,
  pause: vi.fn(),
  play: vi.fn(),
  showSnackbar: vi.fn(),
}));

vi.mock('@/constants/app', () => ({ IS_NATIVE_APP: false }));
vi.mock('@/contexts/snackbar', () => ({
  useSnackbar: () => mocks.showSnackbar,
}));
vi.mock('@/hooks/use-sound', () => ({
  useSound: (_src: string, options: { onError?: () => void }) => {
    mocks.options = options;
    return { pause: mocks.pause, play: mocks.play };
  },
}));

import { Playback } from './playback';

const rain: FileSound = {
  icon: 'BsFillCloudRainFill',
  id: 'light-rain',
  kind: 'file',
  label: 'Light Rain',
  origin: 'bundled',
  playback: { kind: 'loop' },
  source: { kind: 'asset', path: '/sounds/rain/light-rain.mp3' },
};

const initialSounds = structuredClone(useSoundStore.getState().sounds);

beforeEach(() => {
  mocks.options = null;
  mocks.pause.mockClear();
  mocks.play.mockClear();
  mocks.showSnackbar.mockClear();
  useSoundStore.setState({
    history: null,
    isPlaying: true,
    locked: false,
    sounds: {
      ...structuredClone(initialSounds),
      [rain.id]: { isFavorite: false, isSelected: true, volume: 0.5 },
    },
  });
});

afterEach(() => cleanup());

describe('web audio file playback errors', () => {
  it('unselects the sole failed layer and pauses the mix', () => {
    render(
      <Playback
        functional
        isPlaying
        isSelected
        locked={false}
        sound={rain}
        volume={0.5}
      />,
    );
    act(() => mocks.options?.onError?.());
    expect(useSoundStore.getState().sounds[rain.id].isSelected).toBe(false);
    expect(useSoundStore.getState().isPlaying).toBe(false);
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      'Could not play Light Rain.',
    );
  });

  it('does not stop other selected sounds after a file failure', () => {
    const store = useSoundStore.getState();
    store.select('heavy-rain');
    render(
      <Playback
        functional
        isPlaying
        isSelected
        locked={false}
        sound={rain}
        volume={0.5}
      />,
    );
    act(() => mocks.options?.onError?.());
    expect(useSoundStore.getState().sounds['heavy-rain'].isSelected).toBe(true);
    expect(useSoundStore.getState().isPlaying).toBe(true);
  });

  it('ignores an error from a sound that has already been unselected', () => {
    render(
      <Playback
        functional
        isPlaying
        isSelected
        locked={false}
        sound={rain}
        volume={0.5}
      />,
    );
    act(() => useSoundStore.getState().unselect(rain.id));
    act(() => mocks.options?.onError?.());
    expect(mocks.showSnackbar).not.toHaveBeenCalled();
  });
});
