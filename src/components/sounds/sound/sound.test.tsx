// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileSound } from '@/data/types';
import { useSoundStore } from '@/stores/sound';

vi.mock('./favorite', () => ({ Favorite: () => null }));
vi.mock('./range', () => ({ Range: () => null }));
vi.mock('./playback', () => ({ Playback: () => null }));
vi.mock('./user-actions', () => ({ UserSoundActions: () => null }));
vi.mock('@/components/sound-icon', () => ({ SoundIcon: () => null }));
vi.mock('@/hooks/use-keyboard-button', () => ({
  useKeyboardButton: () => () => undefined,
}));

import { Sound } from './sound';

const rain: FileSound = {
  icon: 'BsFillCloudRainFill',
  id: 'light-rain',
  kind: 'file',
  label: 'Light Rain',
  origin: 'bundled',
  playback: { kind: 'loop' },
  source: { kind: 'asset', path: '/sounds/rain/light-rain.mp3' },
};

const originalSounds = structuredClone(useSoundStore.getState().sounds);

beforeEach(() => {
  localStorage.clear();
  useSoundStore.setState({
    history: null,
    isPlaying: false,
    locked: false,
    sounds: structuredClone(originalSounds),
  });
});

afterEach(() => cleanup());

describe('sound tile volume preference', () => {
  it('preserves a configured level after deselection', () => {
    const store = useSoundStore.getState();
    expect(store.sounds[rain.id].volume).toBe(0.5);
    store.select(rain.id);
    store.setVolume(rain.id, 0.73);

    render(
      <Sound
        {...rain}
        functional
        hidden={false}
        selectHidden={() => undefined}
        unselectHidden={() => undefined}
      />,
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Light Rain sound' }));
    });

    const after = useSoundStore.getState().sounds[rain.id];
    expect(after.isSelected).toBe(false);
    expect(after.volume).toBe(0.73);
  });
});
