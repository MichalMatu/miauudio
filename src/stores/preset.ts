import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import merge from 'deepmerge';
import { v4 as uuid } from 'uuid';

import { DEFAULT_GENERATOR_SETTINGS } from '@/stores/generator';

import type { MixSnapshot } from '@/lib/mix-snapshot';

interface PresetStore {
  addPreset: (label: string, snapshot: MixSnapshot) => void;
  changeName: (id: string, newName: string) => void;
  deletePreset: (id: string) => void;
  presets: Array<{
    id: string;
    label: string;
    snapshot: MixSnapshot;
  }>;
}

export const usePresetStore = create<PresetStore>()(
  persist(
    (set, get) => ({
      addPreset(label, snapshot) {
        set({ presets: [{ id: uuid(), label, snapshot }, ...get().presets] });
      },

      changeName(id: string, newName: string) {
        const presets = get().presets.map(preset => {
          if (preset.id === id) return { ...preset, label: newName };

          return preset;
        });

        set({ presets });
      },

      deletePreset(id: string) {
        set({ presets: get().presets.filter(preset => preset.id !== id) });
      },

      presets: [],
    }),
    {
      merge: (persisted, current) =>
        merge(current, persisted as Partial<PresetStore>),

      migrate,
      name: 'miauudio-presets',
      partialize: state => ({ presets: state.presets }),
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);

function migrate(persistedState: unknown, version: number) {
  interface LegacyPreset {
    id?: string;
    label: string;
    sounds: Record<string, number>;
  }

  const persisted = persistedState as {
    presets?: Array<LegacyPreset>;
  };
  let presets = persisted.presets ?? [];

  /**
   * In version 0, presets didn't have an ID
   */
  if (version < 1) {
    presets = presets.map(preset => ({
      ...preset,
      id: preset.id ?? uuid(),
    }));
  }

  if (version < 2) {
    return {
      ...persisted,
      presets: presets.map(preset => ({
        id: preset.id ?? uuid(),
        label: preset.label,
        snapshot: {
          generators: {
            binaural: { ...DEFAULT_GENERATOR_SETTINGS.binaural },
            isochronic: { ...DEFAULT_GENERATOR_SETTINGS.isochronic },
            phase: { ...DEFAULT_GENERATOR_SETTINGS.phase },
          },
          sounds: preset.sounds ?? {},
        },
      })),
    } as PresetStore;
  }

  return persisted as unknown as PresetStore;
}
