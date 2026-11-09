// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from './settings';
import { useSoundStore } from './sound';

const initialSounds = structuredClone(useSoundStore.getState().sounds);

beforeEach(() => {
  localStorage.clear();
  useSoundStore.setState({
    history: null,
    isPlaying: false,
    locked: false,
    sounds: structuredClone(initialSounds),
  });
  useSettingsStore.setState({ alarmVolume: 1, globalVolume: 1 });
});

describe('volume safety', () => {
  it('keeps intentional 50% new-layer defaults', () => {
    expect(useSoundStore.getState().sounds['light-rain'].volume).toBe(0.5);
  });

  it('clamps a finite per-layer value but rejects non-finite values', () => {
    const store = useSoundStore.getState();
    store.setVolume('light-rain', 0.75);
    store.setVolume('light-rain', Number.NaN);
    store.setVolume('light-rain', Infinity);
    expect(useSoundStore.getState().sounds['light-rain'].volume).toBe(0.75);

    store.setVolume('light-rain', 5);
    expect(useSoundStore.getState().sounds['light-rain'].volume).toBe(1);

    store.setVolume('light-rain', -5);
    expect(useSoundStore.getState().sounds['light-rain'].volume).toBe(0);
  });

  it('clamps master and alarm values without storing invalid numbers', () => {
    const settings = useSettingsStore.getState();
    settings.setGlobalVolume(0.35);
    settings.setGlobalVolume(Number.NaN);
    settings.setGlobalVolume(Infinity);
    expect(useSettingsStore.getState().globalVolume).toBe(0.35);

    settings.setAlarmVolume(-10);
    expect(useSettingsStore.getState().alarmVolume).toBe(0);
    settings.setAlarmVolume(3);
    expect(useSettingsStore.getState().alarmVolume).toBe(1);
    settings.setAlarmVolume(Number.NaN);
    expect(useSettingsStore.getState().alarmVolume).toBe(1);
  });
});
