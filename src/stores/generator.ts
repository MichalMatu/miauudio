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
  phaseOffset: number;
  preset: GeneratorPresetId;
  rotationSpeed: number;
  spatialDepth: number;
}

export type GeneratorSettingsSnapshot = Record<GeneratorId, GeneratorSettings>;

interface GeneratorPreset {
  baseFrequency: number;
  beatFrequency: number;
  id: Exclude<GeneratorPresetId, 'custom'>;
  label: string;
}

interface PhasePreset {
  baseFrequency: number;
  id: Exclude<GeneratorPresetId, 'custom'>;
  label: string;
  phaseOffset: number;
  rotationSpeed: number;
}

export const GENERATOR_PRESETS: ReadonlyArray<GeneratorPreset> = [
  { baseFrequency: 100, beatFrequency: 2, id: 'delta', label: 'Delta' },
  { baseFrequency: 100, beatFrequency: 5, id: 'theta', label: 'Theta' },
  { baseFrequency: 100, beatFrequency: 10, id: 'alpha', label: 'Alpha' },
  { baseFrequency: 100, beatFrequency: 20, id: 'beta', label: 'Beta' },
  { baseFrequency: 100, beatFrequency: 40, id: 'gamma', label: 'Gamma' },
];

export const PHASE_PRESETS: ReadonlyArray<PhasePreset> = [
  {
    baseFrequency: 100,
    id: 'delta',
    label: 'Delta',
    phaseOffset: 180,
    rotationSpeed: 0.25,
  },
  {
    baseFrequency: 100,
    id: 'theta',
    label: 'Theta',
    phaseOffset: 180,
    rotationSpeed: 0.5,
  },
  {
    baseFrequency: 100,
    id: 'alpha',
    label: 'Alpha',
    phaseOffset: 180,
    rotationSpeed: 1,
  },
  {
    baseFrequency: 100,
    id: 'beta',
    label: 'Beta',
    phaseOffset: 180,
    rotationSpeed: 2,
  },
  {
    baseFrequency: 100,
    id: 'gamma',
    label: 'Gamma',
    phaseOffset: 180,
    rotationSpeed: 5,
  },
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

export const PHASE_PRESET_OPTIONS: ReadonlyArray<{
  label: string;
  value: GeneratorPresetId;
}> = [
  ...PHASE_PRESETS.map(preset => ({
    label: `${preset.label} (${preset.rotationSpeed} Hz)`,
    value: preset.id,
  })),
  { label: 'Custom', value: 'custom' },
];

const DEFAULT_BEAT_SETTINGS: GeneratorSettings = {
  baseFrequency: 100,
  beatFrequency: 10,
  phaseOffset: 0,
  preset: 'alpha',
  rotationSpeed: 0,
  spatialDepth: 0,
};

const DEFAULT_PHASE_SETTINGS: GeneratorSettings = {
  baseFrequency: 100,
  beatFrequency: 0,
  phaseOffset: 180,
  preset: 'alpha',
  rotationSpeed: 1,
  spatialDepth: 100,
};

export const DEFAULT_GENERATOR_SETTINGS: GeneratorSettingsSnapshot = {
  binaural: { ...DEFAULT_BEAT_SETTINGS },
  isochronic: { ...DEFAULT_BEAT_SETTINGS },
  phase: { ...DEFAULT_PHASE_SETTINGS },
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

function normalizeBeatGeneratorSettings(
  generator: Extract<GeneratorId, 'binaural' | 'isochronic'>,
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
    phaseOffset: 0,
    preset: PRESET_IDS.has(settings.preset) ? settings.preset : 'custom',
    rotationSpeed: 0,
    spatialDepth: 0,
  };
}

function normalizePhaseSettings(
  settings: GeneratorSettings,
): GeneratorSettings {
  return {
    baseFrequency: clamp(
      Number.isFinite(settings.baseFrequency) ? settings.baseFrequency : 100,
      20,
      2000,
    ),
    beatFrequency: 0,
    phaseOffset: clamp(
      Number.isFinite(settings.phaseOffset) ? settings.phaseOffset : 180,
      0,
      360,
    ),
    preset: PRESET_IDS.has(settings.preset) ? settings.preset : 'custom',
    rotationSpeed: clamp(
      Number.isFinite(settings.rotationSpeed) ? settings.rotationSpeed : 0,
      0,
      40,
    ),
    spatialDepth: clamp(
      Number.isFinite(settings.spatialDepth) ? settings.spatialDepth : 100,
      0,
      100,
    ),
  };
}

function normalizeSettings(
  generator: GeneratorId,
  settings: GeneratorSettings,
): GeneratorSettings {
  if (generator === 'phase') return normalizePhaseSettings(settings);

  return normalizeBeatGeneratorSettings(generator, settings);
}

function cloneSnapshot(
  settings: GeneratorSettingsSnapshot,
): GeneratorSettingsSnapshot {
  return {
    binaural: { ...settings.binaural },
    isochronic: { ...settings.isochronic },
    phase: { ...settings.phase },
  };
}

function withDefaults(
  generator: GeneratorId,
  settings: Partial<GeneratorSettings> | undefined,
): GeneratorSettings {
  const defaults = DEFAULT_GENERATOR_SETTINGS[generator];

  return normalizeSettings(generator, {
    ...defaults,
    ...settings,
  });
}

export const useGeneratorStore = create<GeneratorStore>()(
  persist(
    (set, get) => ({
      apply(snapshot) {
        set({
          settings: {
            binaural: withDefaults('binaural', snapshot.binaural),
            isochronic: withDefaults('isochronic', snapshot.isochronic),
            phase: withDefaults('phase', snapshot.phase),
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
            binaural: withDefaults('binaural', settings.binaural),
            isochronic: withDefaults('isochronic', settings.isochronic),
            phase: withDefaults('phase', settings.phase),
          },
        };
      },
      name: GENERATOR_STORAGE_KEY,
      partialize: state => ({ settings: state.settings }),
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const persisted = persistedState as {
          settings?: Partial<GeneratorSettingsSnapshot>;
        };

        if (version < 2) {
          const thetaPreset = PHASE_PRESETS.find(
            preset => preset.id === 'theta',
          );

          return {
            settings: {
              binaural: withDefaults('binaural', persisted.settings?.binaural),
              isochronic: withDefaults(
                'isochronic',
                persisted.settings?.isochronic,
              ),
              phase: normalizePhaseSettings({
                ...DEFAULT_PHASE_SETTINGS,
                ...thetaPreset,
                preset: 'theta',
              }),
            },
          } as GeneratorStore;
        }

        if (version < 3) {
          const settings = persisted.settings ?? {};

          return {
            settings: {
              binaural: withDefaults('binaural', settings.binaural),
              isochronic: withDefaults('isochronic', settings.isochronic),
              phase: withDefaults('phase', {
                ...settings.phase,
                spatialDepth: 100,
              }),
            },
          } as GeneratorStore;
        }

        return persistedState as GeneratorStore;
      },
      version: 3,
    },
  ),
);
