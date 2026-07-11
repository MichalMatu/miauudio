import { describe, expect, it } from 'vitest';

import type { SoundDefinition } from '../data/types';
import type { GeneratorSettingsSnapshot } from '../stores/generator';
import type { SoundValue } from '../stores/sound';
import type { NativeAudioLayer, NativeAudioState } from './native-audio';
import {
  clampNativeAudioVolume,
  createNativeAudioLayers,
  createNativeMixFingerprint,
  isCurrentNativeCommandState,
  isNewerNativeState,
} from './native-audio-state';

const generatorSettings: GeneratorSettingsSnapshot = {
  binaural: {
    baseFrequency: 120,
    beatFrequency: 8,
    preset: 'custom',
  },
  isochronic: {
    baseFrequency: 180,
    beatFrequency: 12,
    preset: 'custom',
  },
};

function soundValue(isSelected: boolean, volume: number): SoundValue {
  return { isFavorite: false, isSelected, volume };
}

function nativeState(
  overrides: Partial<NativeAudioState> = {},
): NativeAudioState {
  return {
    activeLayerIds: ['rain'],
    playbackState: 'ready',
    playWhenReady: true,
    reason: 'service',
    requestId: null,
    sequence: 1,
    sessionId: 'session-a',
    timerEndsAt: null,
    ...overrides,
  };
}

describe('createNativeAudioLayers', () => {
  it('maps selected bundled, imported, and generator sounds', () => {
    const definitions: Array<SoundDefinition> = [
      {
        icon: 'BsFillCloudRainFill',
        id: 'rain',
        kind: 'file',
        label: 'Rain',
        origin: 'bundled',
        playback: { kind: 'loop' },
        source: { kind: 'asset', path: '/sounds/rain/light-rain.mp3' },
      },
      {
        icon: 'IoMusicalNotes',
        id: 'user-550e8400-e29b-41d4-a716-446655440000',
        kind: 'file',
        label: 'Evening rain',
        origin: 'user',
        playback: { kind: 'loop' },
        source: {
          fileId: '550e8400-e29b-41d4-a716-446655440000.mp3',
          kind: 'app-file',
        },
      },
      {
        generator: 'binaural',
        icon: 'FaHeadphonesAlt',
        id: 'binaural',
        kind: 'generator',
        label: 'Binaural Beats',
        origin: 'bundled',
        playback: { kind: 'loop' },
      },
    ];
    const sounds = {
      binaural: soundValue(true, 0.4),
      rain: soundValue(true, 0.6),
      'user-550e8400-e29b-41d4-a716-446655440000': soundValue(true, 0.7),
    };

    expect(
      createNativeAudioLayers(definitions, sounds, generatorSettings),
    ).toEqual([
      {
        id: 'rain',
        kind: 'file',
        loop: true,
        source: { kind: 'asset', path: 'sounds/rain/light-rain.mp3' },
        volume: 0.6,
      },
      {
        id: 'user-550e8400-e29b-41d4-a716-446655440000',
        kind: 'file',
        loop: true,
        source: {
          fileId: '550e8400-e29b-41d4-a716-446655440000.mp3',
          kind: 'app-file',
        },
        volume: 0.7,
      },
      {
        generator: 'binaural',
        id: 'binaural',
        kind: 'generator',
        settings: { baseFrequency: 120, beatFrequency: 8 },
        volume: 0.4,
      },
    ]);
  });

  it('omits unselected sounds and clamps invalid volumes', () => {
    const definitions: Array<SoundDefinition> = [
      {
        icon: 'BsFillCloudRainFill',
        id: 'low',
        kind: 'file',
        label: 'Low',
        origin: 'bundled',
        playback: { kind: 'loop' },
        source: { kind: 'asset', path: '/sounds/low.mp3' },
      },
      {
        icon: 'BsFillCloudRainHeavyFill',
        id: 'invalid',
        kind: 'file',
        label: 'Invalid',
        origin: 'bundled',
        playback: { kind: 'loop' },
        source: { kind: 'asset', path: '/sounds/invalid.mp3' },
      },
      {
        icon: 'MdOutlineThunderstorm',
        id: 'hidden',
        kind: 'file',
        label: 'Hidden',
        origin: 'bundled',
        playback: { kind: 'loop' },
        source: { kind: 'asset', path: '/sounds/hidden.mp3' },
      },
    ];

    const layers = createNativeAudioLayers(
      definitions,
      {
        hidden: soundValue(false, 1),
        invalid: soundValue(true, Number.NaN),
        low: soundValue(true, -2),
      },
      generatorSettings,
    );

    expect(layers.map(layer => layer.volume)).toEqual([0, 0.5]);
    expect(clampNativeAudioVolume(2)).toBe(1);
  });
});

describe('native state ordering', () => {
  it('rejects non-increasing sequences only within the same session', () => {
    const cursor = { sequence: 4, sessionId: 'session-a' };

    expect(isNewerNativeState(cursor, nativeState({ sequence: 4 }))).toBe(
      false,
    );
    expect(isNewerNativeState(cursor, nativeState({ sequence: 3 }))).toBe(
      false,
    );
    expect(isNewerNativeState(cursor, nativeState({ sequence: 5 }))).toBe(true);
    expect(
      isNewerNativeState(
        cursor,
        nativeState({ sequence: 0, sessionId: 'session-b' }),
      ),
    ).toBe(true);
  });

  it('rejects stale command responses without rejecting transport events', () => {
    expect(
      isCurrentNativeCommandState(
        nativeState({ reason: 'command', requestId: 'request-old' }),
        'request-new',
      ),
    ).toBe(false);
    expect(
      isCurrentNativeCommandState(
        nativeState({ reason: 'command', requestId: 'request-new' }),
        'request-new',
      ),
    ).toBe(true);
    expect(
      isCurrentNativeCommandState(
        nativeState({ reason: 'media-button', requestId: 'request-old' }),
        'request-new',
      ),
    ).toBe(true);
  });
});

describe('native mix fingerprint', () => {
  it('changes when layer or master-volume configuration changes', () => {
    const layers: Array<NativeAudioLayer> = [
      {
        id: 'rain',
        kind: 'file',
        loop: true,
        source: { kind: 'asset', path: 'sounds/rain.mp3' },
        volume: 0.5,
      },
    ];

    const fingerprint = createNativeMixFingerprint(layers, 0.8);

    expect(createNativeMixFingerprint(layers, 0.8)).toBe(fingerprint);
    expect(createNativeMixFingerprint(layers, 0.7)).not.toBe(fingerprint);
    expect(
      createNativeMixFingerprint([{ ...layers[0], volume: 0.6 }], 0.8),
    ).not.toBe(fingerprint);
  });
});
