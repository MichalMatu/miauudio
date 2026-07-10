import { sounds as soundCategories } from '@/data/sounds';
import {
  GENERATOR_PRESETS,
  useGeneratorStore,
  type GeneratorPresetId,
  type GeneratorSettings,
  type GeneratorSettingsSnapshot,
} from '@/stores/generator';
import { useSoundStore } from '@/stores/sound';

import type { GeneratorId } from '@/data/types';

export interface MixSnapshot {
  generators: GeneratorSettingsSnapshot;
  sounds: Record<string, number>;
}

export interface SharedMixPayload {
  snapshot: MixSnapshot;
  version: 1;
}

const GENERATOR_IDS: ReadonlyArray<GeneratorId> = ['binaural', 'isochronic'];
const GENERATOR_PRESET_IDS = new Set<GeneratorPresetId>([
  ...GENERATOR_PRESETS.map(preset => preset.id),
  'custom',
]);
const SOUND_IDS = new Set(
  soundCategories.categories.flatMap(category =>
    category.sounds.map(sound => sound.id),
  ),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGeneratorSettings(
  generator: GeneratorId,
  value: unknown,
): value is GeneratorSettings {
  if (!isRecord(value)) return false;

  const { baseFrequency, beatFrequency, preset } = value;

  if (typeof baseFrequency !== 'number' || !Number.isFinite(baseFrequency))
    return false;
  if (typeof beatFrequency !== 'number' || !Number.isFinite(beatFrequency))
    return false;
  if (typeof preset !== 'string') return false;
  if (!GENERATOR_PRESET_IDS.has(preset as GeneratorPresetId)) return false;
  if (beatFrequency < 0.1 || beatFrequency > 40) return false;
  if (baseFrequency > 2000) return false;

  const minimumBaseFrequency =
    generator === 'binaural' ? beatFrequency / 2 + 0.1 : 20;

  if (baseFrequency < minimumBaseFrequency) return false;

  if (preset !== 'custom') {
    const definition = GENERATOR_PRESETS.find(item => item.id === preset);

    if (!definition) return false;
    if (definition.baseFrequency !== baseFrequency) return false;
    if (definition.beatFrequency !== beatFrequency) return false;
  }

  return true;
}

function cloneGeneratorSettings(
  settings: GeneratorSettingsSnapshot,
): GeneratorSettingsSnapshot {
  return {
    binaural: { ...settings.binaural },
    isochronic: { ...settings.isochronic },
  };
}

export function captureMixSnapshot(): MixSnapshot {
  const soundState = useSoundStore.getState().sounds;
  const selectedSounds: Record<string, number> = {};

  Object.entries(soundState).forEach(([id, sound]) => {
    if (sound.isSelected) selectedSounds[id] = sound.volume;
  });

  return {
    generators: useGeneratorStore.getState().snapshot(),
    sounds: selectedSounds,
  };
}

export function applyMixSnapshot(
  snapshot: MixSnapshot,
  { autoplay }: { autoplay: boolean },
) {
  const generatorStore = useGeneratorStore.getState();
  const nextGeneratorSettings = generatorStore.snapshot();

  GENERATOR_IDS.forEach(generator => {
    if (snapshot.sounds[generator] === undefined) return;

    nextGeneratorSettings[generator] = {
      ...snapshot.generators[generator],
    };
  });

  generatorStore.apply(nextGeneratorSettings);

  const soundStore = useSoundStore.getState();
  soundStore.override(snapshot.sounds);

  if (autoplay) soundStore.play();
  else soundStore.pause();
}

export function createSharedMixPayload(
  snapshot: MixSnapshot,
): SharedMixPayload {
  return { snapshot, version: 1 };
}

export function parseSharedMixPayload(input: unknown): MixSnapshot | null {
  if (!isRecord(input) || input.version !== 1) return null;
  if (!isRecord(input.snapshot)) return null;

  const snapshot = input.snapshot;
  if (!isRecord(snapshot.sounds) || !isRecord(snapshot.generators)) return null;

  const selectedSounds: Record<string, number> = {};

  for (const [id, volume] of Object.entries(snapshot.sounds)) {
    if (!SOUND_IDS.has(id)) return null;
    if (typeof volume !== 'number' || !Number.isFinite(volume)) return null;
    if (volume < 0 || volume > 1) return null;

    selectedSounds[id] = volume;
  }

  if (!Object.keys(selectedSounds).length) return null;

  const generators = snapshot.generators;
  if (!isGeneratorSettings('binaural', generators.binaural)) return null;
  if (!isGeneratorSettings('isochronic', generators.isochronic)) return null;

  return {
    generators: cloneGeneratorSettings({
      binaural: generators.binaural,
      isochronic: generators.isochronic,
    }),
    sounds: selectedSounds,
  };
}
