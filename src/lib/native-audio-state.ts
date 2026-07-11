import type { SoundDefinition } from '../data/types';
import type { GeneratorSettingsSnapshot } from '../stores/generator';
import type { SoundValue } from '../stores/sound';
import type { NativeAudioLayer, NativeAudioState } from './native-audio';

export interface NativeStateCursor {
  sequence: number;
  sessionId: string;
}

export function clampNativeAudioVolume(value: number) {
  if (!Number.isFinite(value)) return 0.5;

  return Math.min(1, Math.max(0, value));
}

export function createNativeAudioLayers(
  definitions: ReadonlyArray<SoundDefinition>,
  soundState: Record<string, SoundValue>,
  generatorSettings: GeneratorSettingsSnapshot,
) {
  return definitions.flatMap<NativeAudioLayer>(definition => {
    const state = soundState[definition.id];
    if (!state?.isSelected) return [];

    const volume = clampNativeAudioVolume(state.volume);

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
            path: definition.source.path.replace(/^\/+/, ''),
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

export function createNativeMixFingerprint(
  layers: ReadonlyArray<NativeAudioLayer>,
  masterVolume: number,
) {
  return JSON.stringify({ layers, masterVolume });
}

export function isNewerNativeState(
  latest: NativeStateCursor | null,
  candidate: NativeAudioState,
) {
  return !(
    latest?.sessionId === candidate.sessionId &&
    candidate.sequence <= latest.sequence
  );
}

export function isCurrentNativeCommandState(
  state: NativeAudioState,
  latestRequestId: string | null,
) {
  return !(
    state.reason === 'command' &&
    state.requestId &&
    latestRequestId &&
    state.requestId !== latestRequestId
  );
}
