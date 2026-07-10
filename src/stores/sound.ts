import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { bundledCategories } from '@/data/sounds';
import { pickMany, random } from '@/helpers/random';

export interface SoundValue {
  isFavorite: boolean;
  isSelected: boolean;
  volume: number;
}

export interface SoundOverrideResult {
  appliedIds: Array<string>;
  missingIds: Array<string>;
}

interface SoundStore {
  getFavorites: () => Array<string>;
  history: Record<string, SoundValue> | null;
  isPlaying: boolean;
  lock: () => void;
  locked: boolean;
  noSelected: () => boolean;
  override: (sounds: Record<string, number>) => SoundOverrideResult;
  pause: () => void;
  play: () => void;
  reconcileUserSounds: (ids: Array<string>) => void;
  register: (ids: Array<string>) => void;
  remove: (id: string) => void;
  restoreHistory: () => void;
  select: (id: string) => void;
  setVolume: (id: string, volume: number) => void;
  shuffle: (ids: Array<string>) => void;
  sounds: Record<string, SoundValue>;
  toggleFavorite: (id: string) => void;
  togglePlay: () => void;
  unlock: () => void;
  unselect: (id: string) => void;
  unselectAll: (pushToHistory?: boolean) => void;
}

const INITIAL_SOUND_VALUE: Readonly<SoundValue> = {
  isFavorite: false,
  isSelected: false,
  volume: 0.5,
};

const USER_SOUND_ID =
  /^user-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createSoundValue(): SoundValue {
  return { ...INITIAL_SOUND_VALUE };
}

function createInitialSounds() {
  return Object.fromEntries(
    bundledCategories.flatMap(category =>
      category.sounds.map(sound => [sound.id, createSoundValue()]),
    ),
  );
}

function resetSelection(sounds: Record<string, SoundValue>) {
  return Object.fromEntries(
    Object.entries(sounds).map(([id, sound]) => [
      id,
      { ...sound, isSelected: false, volume: 0.5 },
    ]),
  );
}

function normalizeSoundValue(value: unknown): SoundValue | null {
  if (!value || typeof value !== 'object') return null;

  const sound = value as Partial<SoundValue>;
  if (typeof sound.isFavorite !== 'boolean') return null;
  if (typeof sound.isSelected !== 'boolean') return null;
  if (typeof sound.volume !== 'number' || !Number.isFinite(sound.volume))
    return null;

  return {
    isFavorite: sound.isFavorite,
    isSelected: sound.isSelected,
    volume: Math.min(1, Math.max(0, sound.volume)),
  };
}

function normalizePersistedSounds(value: unknown) {
  if (!value || typeof value !== 'object') return {};

  const normalized: Record<string, SoundValue> = {};

  Object.entries(value).forEach(([id, sound]) => {
    const nextSound = normalizeSoundValue(sound);
    if (nextSound) normalized[id] = nextSound;
  });

  return normalized;
}

function isUserSoundId(id: string) {
  return USER_SOUND_ID.test(id);
}

export function mergePersistedSounds(
  currentSounds: Record<string, SoundValue>,
  persistedValue: unknown,
) {
  const persistedSounds = normalizePersistedSounds(persistedValue);
  const sounds = Object.fromEntries(
    Object.entries(currentSounds).map(([id, sound]) => [
      id,
      persistedSounds[id] ?? sound,
    ]),
  );

  Object.entries(persistedSounds).forEach(([id, sound]) => {
    if (isUserSoundId(id) && !sounds[id]) sounds[id] = sound;
  });

  return sounds;
}

export const useSoundStore = create<SoundStore>()(
  persist(
    (set, get) => ({
      getFavorites() {
        return Object.entries(get().sounds)
          .filter(([, sound]) => sound.isFavorite)
          .map(([id]) => id);
      },

      history: null,
      isPlaying: false,

      lock() {
        set({ locked: true });
      },

      locked: false,

      noSelected() {
        return Object.values(get().sounds).every(sound => !sound.isSelected);
      },

      override(newSounds) {
        const sounds = resetSelection(get().sounds);
        const appliedIds: Array<string> = [];
        const missingIds: Array<string> = [];

        Object.entries(newSounds).forEach(([id, volume]) => {
          if (!sounds[id]) {
            missingIds.push(id);
            return;
          }

          sounds[id] = {
            ...sounds[id],
            isSelected: true,
            volume: Number.isFinite(volume)
              ? Math.min(1, Math.max(0, volume))
              : 0.5,
          };
          appliedIds.push(id);
        });

        set({ history: null, sounds });

        return { appliedIds, missingIds };
      },

      pause() {
        set({ isPlaying: false });
      },

      play() {
        set({ isPlaying: true });
      },

      reconcileUserSounds(ids) {
        const allowedIds = new Set(ids.filter(isUserSoundId));
        const currentSounds = get().sounds;
        const sounds = Object.fromEntries(
          Object.entries(currentSounds).filter(
            ([id]) => !isUserSoundId(id) || allowedIds.has(id),
          ),
        );

        allowedIds.forEach(id => {
          if (!sounds[id]) sounds[id] = createSoundValue();
        });

        const currentIds = Object.keys(currentSounds);
        const nextIds = Object.keys(sounds);
        if (
          currentIds.length === nextIds.length &&
          currentIds.every(id => sounds[id] === currentSounds[id])
        ) {
          return;
        }

        const currentHistory = get().history;
        const history = currentHistory
          ? Object.fromEntries(
              Object.entries(currentHistory).filter(
                ([id]) => !isUserSoundId(id) || allowedIds.has(id),
              ),
            )
          : null;

        set({ history, sounds });
      },

      register(ids) {
        const sounds = { ...get().sounds };
        let changed = false;

        ids.forEach(id => {
          if (sounds[id]) return;
          sounds[id] = createSoundValue();
          changed = true;
        });

        if (changed) set({ sounds });
      },

      remove(id) {
        const sounds = { ...get().sounds };
        if (!sounds[id]) return;

        delete sounds[id];

        const history = get().history ? { ...get().history } : null;
        if (history) delete history[id];

        set({ history, sounds });
      },

      restoreHistory() {
        const history = get().history;
        if (!history) return;

        const registeredSounds = get().sounds;
        const sounds = Object.fromEntries(
          Object.keys(registeredSounds).map(id => [
            id,
            history[id] ?? registeredSounds[id],
          ]),
        );

        set({ history: null, sounds });
      },

      select(id) {
        const sounds = get().sounds;
        if (!sounds[id]) return;

        set({
          history: null,
          sounds: {
            ...sounds,
            [id]: { ...sounds[id], isSelected: true },
          },
        });
      },

      setVolume(id, volume) {
        const sounds = get().sounds;
        if (!sounds[id]) return;

        set({
          sounds: {
            ...sounds,
            [id]: {
              ...sounds[id],
              volume: Math.min(1, Math.max(0, volume)),
            },
          },
        });
      },

      shuffle(ids) {
        const sounds = resetSelection(get().sounds);
        const registeredIds = ids.filter(id => sounds[id]);
        const randomIDs = pickMany(registeredIds, 4);

        randomIDs.forEach(id => {
          sounds[id] = {
            ...sounds[id],
            isSelected: true,
            volume: random(0.2, 1),
          };
        });

        set({ history: null, isPlaying: randomIDs.length > 0, sounds });
      },

      sounds: createInitialSounds(),

      toggleFavorite(id) {
        const sounds = get().sounds;
        if (!sounds[id]) return;

        set({
          history: null,
          sounds: {
            ...sounds,
            [id]: { ...sounds[id], isFavorite: !sounds[id].isFavorite },
          },
        });
      },

      togglePlay() {
        set({ isPlaying: !get().isPlaying });
      },

      unlock() {
        set({ locked: false });
      },

      unselect(id) {
        const sounds = get().sounds;
        if (!sounds[id]) return;

        set({
          sounds: {
            ...sounds,
            [id]: { ...sounds[id], isSelected: false },
          },
        });
      },

      unselectAll(pushToHistory = false) {
        if (get().noSelected()) return;

        const sounds = get().sounds;

        if (pushToHistory) {
          set({ history: structuredClone(sounds) });
        }

        set({ sounds: resetSelection(sounds) });
      },
    }),
    {
      merge: (persisted, current) => {
        const sounds = mergePersistedSounds(
          current.sounds,
          (persisted as Partial<SoundStore> | undefined)?.sounds,
        );

        return { ...current, sounds };
      },
      migrate: persistedState => {
        const persisted = persistedState as Partial<SoundStore>;

        return {
          ...persisted,
          sounds: normalizePersistedSounds(persisted.sounds),
        } as SoundStore;
      },
      name: 'miauudio-sounds',
      partialize: state => ({ sounds: state.sounds }),
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
