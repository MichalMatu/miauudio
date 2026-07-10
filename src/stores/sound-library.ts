import { create } from 'zustand';

import {
  deleteImportedSound,
  importSound as importNativeSound,
  listImportedSounds,
  renameImportedSound,
  type ImportedSoundRecord,
} from '@/lib/native-audio';
import { useSoundStore } from '@/stores/sound';

import type { FileSound } from '@/data/types';

interface SoundLibraryStore {
  error: string | null;
  importSound: () => Promise<ImportedSoundRecord | null>;
  importing: boolean;
  initialize: () => Promise<void>;
  initialized: boolean;
  pendingIds: Array<string>;
  records: Array<ImportedSoundRecord>;
  removeSound: (id: string) => Promise<void>;
  renameSound: (id: string, label: string) => Promise<ImportedSoundRecord>;
}

let initialization: Promise<void> | null = null;

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'The sound library failed.';
}

function sortRecords(records: Array<ImportedSoundRecord>) {
  return [...records].sort((left, right) => right.importedAt - left.importedAt);
}

function setPending(id: string, pending: boolean) {
  useSoundLibraryStore.setState(state => ({
    pendingIds: pending
      ? [...new Set([...state.pendingIds, id])]
      : state.pendingIds.filter(pendingId => pendingId !== id),
  }));
}

export function toUserSoundDefinition(record: ImportedSoundRecord): FileSound {
  return {
    icon: 'IoMusicalNotes',
    id: record.id,
    kind: 'file',
    label: record.label,
    origin: 'user',
    playback: { kind: 'loop' },
    source: { fileId: record.fileId, kind: 'app-file' },
  };
}

export const useSoundLibraryStore = create<SoundLibraryStore>((set, get) => ({
  error: null,

  async importSound() {
    if (get().importing) return null;

    set({ error: null, importing: true });

    try {
      const record = await importNativeSound();
      if (!record) return null;

      useSoundStore.getState().register([record.id]);
      set(state => ({
        records: sortRecords([
          record,
          ...state.records.filter(item => item.id !== record.id),
        ]),
      }));

      return record;
    } catch (error) {
      set({ error: messageFrom(error) });
      throw error;
    } finally {
      set({ importing: false });
    }
  },

  importing: false,

  initialize() {
    if (get().initialized) return Promise.resolve();
    if (initialization) return initialization;

    initialization = listImportedSounds()
      .then(records => {
        const sortedRecords = sortRecords(records);
        useSoundStore
          .getState()
          .reconcileUserSounds(sortedRecords.map(record => record.id));
        set({
          error: null,
          initialized: true,
          records: sortedRecords,
        });
      })
      .catch(error => {
        set({
          error: messageFrom(error),
          initialized: false,
        });
        throw error;
      })
      .finally(() => {
        initialization = null;
      });

    return initialization;
  },

  initialized: false,
  pendingIds: [],
  records: [],

  async removeSound(id) {
    const record = get().records.find(item => item.id === id);
    if (!record || get().pendingIds.includes(id)) return;

    set({ error: null });
    setPending(id, true);
    useSoundStore.getState().unselect(id);

    try {
      await deleteImportedSound(id);
      set(state => ({
        records: state.records.filter(item => item.id !== id),
      }));
      useSoundStore.getState().remove(id);
    } catch (error) {
      set({ error: messageFrom(error) });
      throw error;
    } finally {
      setPending(id, false);
    }
  },

  async renameSound(id, label) {
    const nextLabel = label.trim();
    const record = get().records.find(item => item.id === id);
    if (!record || get().pendingIds.includes(id)) {
      throw new Error('The sound is not available.');
    }
    if (!nextLabel) throw new Error('Enter a sound name.');

    set({ error: null });
    setPending(id, true);

    try {
      const updated = await renameImportedSound(id, nextLabel);
      set(state => ({
        records: state.records.map(item => (item.id === id ? updated : item)),
      }));

      return updated;
    } catch (error) {
      set({ error: messageFrom(error) });
      throw error;
    } finally {
      setPending(id, false);
    }
  },
}));
