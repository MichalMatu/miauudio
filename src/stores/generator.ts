import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { GeneratorId } from '@/data/types';

export type { GeneratorId } from '@/data/types';

export const GENERATOR_STORAGE_KEY = 'miauudio-generators';

export type GeneratorPresetId =
  | 'delta'
  | 'theta'
  | 'alpha'
  | 'beta'
  | 'gamma'
  | 'custom';

export interface GeneratorSettings {
  baseFrequency: number;
  beatFrequency: number;
  preset: GeneratorPresetId;
}

export type GeneratorSettingsSnapshot = Record<GeneratorId, GeneratorSettings>;

interface GeneratorPreset {
  baseFrequency: number;
  beatFrequency: number;
  id: Exclude<GeneratorPresetId, 'custom'>;
  label: string;
}

export const GENERATOR_PRESETS: ReadonlyArray<GeneratorPreset> = [
  { baseFrequency: 100, beatFrequency: 2, id: 'delta', label: 'Delta' },
  { baseFrequency: 100, beatFrequency: 5, id: 'theta', label: 'Theta' },
  { baseFrequency: 100, beatFrequency: 10, id: 'alpha', label: 'Alpha' },
  { baseFrequency: 100, beatFrequency: 20, id: 'beta', label: 'Beta' },
  { baseFrequency: 100, beatFrequency: 40, id: 'gamma', label: 'Gamma' },
];

export const GENERATOR_PRESET_OPTIONS: ReadonlyArray<{
  label: string;
  value: GeneratorPresetId;
}> = [
  ...GENERATOR_PRESETS.map(preset => ({
    label: preset.label,
    value: preset.id,
  })),
  { label: 'Custom', value: 'custom' },
];

const DEFAULT_SETTINGS: GeneratorSettings = {
  baseFrequency: 100,
  beatFrequency: 10,
  preset: 'alpha',
};

export const DEFAULT_GENERATOR_SETTINGS: GeneratorSettingsSnapshot = {
  binaural: { ...DEFAULT_SETTINGS },
  isochronic: { ...DEFAULT_SETTINGS },
};

type GeneratorSettingsPatch = Partial<GeneratorSettings>;

interface GeneratorStore {
  apply: (snapshot: GeneratorSettingsSnapshot) => void;
  setSettings: (generator: GeneratorId, patch: GeneratorSettingsPatch) => void;
  settings: GeneratorSettingsSnapshot;
  snapshot: () => GeneratorSettingsSnapshot;
}

const PRESET_IDS = new Set<GeneratorPresetId>([
  ...GENERATOR_PRESETS.map(preset => preset.id),
  'custom',
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeSettings(
  generator: GeneratorId,
  settings: GeneratorSettings,
): GeneratorSettings {
  const beatFrequency = clamp(
    Number.isFinite(settings.beatFrequency) ? settings.beatFrequency : 10,
    0.1,
    40,
  );
  const minimumBaseFrequency =
    generator === 'binaural' ? beatFrequency / 2 + 0.1 : 20;

  return {
    baseFrequency: clamp(
      Number.isFinite(settings.baseFrequency) ? settings.baseFrequency : 100,
      minimumBaseFrequency,
      2000,
    ),
    beatFrequency,
    preset: PRESET_IDS.has(settings.preset) ? settings.preset : 'custom',
  };
}

function cloneSnapshot(
  settings: GeneratorSettingsSnapshot,
): GeneratorSettingsSnapshot {
  return {
    binaural: { ...settings.binaural },
    isochronic: { ...settings.isochronic },
  };
}

export const useGeneratorStore = create<GeneratorStore>()(
  persist(
    (set, get) => ({
      apply(snapshot) {
        set({
          settings: {
            binaural: normalizeSettings('binaural', snapshot.binaural),
            isochronic: normalizeSettings('isochronic', snapshot.isochronic),
          },
        });
      },

      setSettings(generator, patch) {
        set(state => ({
          settings: {
            ...state.settings,
            [generator]: normalizeSettings(generator, {
              ...state.settings[generator],
              ...patch,
            }),
          },
        }));
      },

      settings: cloneSnapshot(DEFAULT_GENERATOR_SETTINGS),

      snapshot() {
        return cloneSnapshot(get().settings);
      },
    }),
    {
      merge: (persisted, current) => {
        const stored = persisted as Partial<GeneratorStore>;
        const settings = stored.settings;

        if (!settings) return current;

        return {
          ...current,
          settings: {
            binaural: normalizeSettings(
              'binaural',
              settings.binaural ?? DEFAULT_GENERATOR_SETTINGS.binaural,
            ),
            isochronic: normalizeSettings(
              'isochronic',
              settings.isochronic ?? DEFAULT_GENERATOR_SETTINGS.isochronic,
            ),
          },
        };
      },
      name: GENERATOR_STORAGE_KEY,
      partialize: state => ({ settings: state.settings }),
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      version: 0,
    },
  ),
);
