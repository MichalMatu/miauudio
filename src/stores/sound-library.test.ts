// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImportedSoundRecord } from '@/lib/native-audio';
import { useSoundStore } from '@/stores/sound';

const nativeMocks = vi.hoisted(() => ({
  deleteImportedSound: vi.fn(),
  importSound: vi.fn(),
  listImportedSounds: vi.fn(),
  renameImportedSound: vi.fn(),
}));

vi.mock('@/lib/native-audio', () => ({
  deleteImportedSound: nativeMocks.deleteImportedSound,
  importSound: nativeMocks.importSound,
  listImportedSounds: nativeMocks.listImportedSounds,
  renameImportedSound: nativeMocks.renameImportedSound,
}));

import { useSoundLibraryStore } from './sound-library';

const userId = 'user-550e8400-e29b-41d4-a716-446655440000';
const secondUserId = 'user-6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const initialSounds = structuredClone(useSoundStore.getState().sounds);

function record(
  id = userId,
  importedAt = 1_783_748_210_680,
): ImportedSoundRecord {
  return {
    durationMs: 15_987,
    fileId: `${id.slice(5)}.mp3`,
    id,
    importedAt,
    label: 'Evening rain',
    mimeType: 'audio/mpeg',
    originalName: 'valid-clock.mp3',
    sizeBytes: 90_674,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
  useSoundStore.setState({
    history: null,
    isPlaying: false,
    locked: false,
    sounds: structuredClone(initialSounds),
  });
  useSoundLibraryStore.setState({
    error: null,
    importing: false,
    initialized: false,
    pendingIds: [],
    records: [],
  });

  nativeMocks.deleteImportedSound.mockResolvedValue(undefined);
  nativeMocks.importSound.mockResolvedValue(null);
  nativeMocks.listImportedSounds.mockResolvedValue([]);
  nativeMocks.renameImportedSound.mockImplementation(
    (id: string, label: string) => Promise.resolve({ ...record(id), label }),
  );
});

describe('sound library synchronization', () => {
  it('deduplicates concurrent initialization and sorts native records', async () => {
    const pending = deferred<Array<ImportedSoundRecord>>();
    nativeMocks.listImportedSounds.mockReturnValue(pending.promise);

    const first = useSoundLibraryStore.getState().initialize();
    const second = useSoundLibraryStore.getState().initialize();
    pending.resolve([record(userId, 1), record(secondUserId, 2)]);
    await Promise.all([first, second]);

    expect(nativeMocks.listImportedSounds).toHaveBeenCalledTimes(1);
    expect(
      useSoundLibraryStore.getState().records.map(item => item.id),
    ).toEqual([secondUserId, userId]);
    expect(useSoundStore.getState().sounds[userId]).toBeDefined();
    expect(useSoundStore.getState().sounds[secondUserId]).toBeDefined();
  });

  it('does not register anything when the picker is cancelled', async () => {
    const before = Object.keys(useSoundStore.getState().sounds);

    await expect(
      useSoundLibraryStore.getState().importSound(),
    ).resolves.toBeNull();

    expect(useSoundLibraryStore.getState().records).toEqual([]);
    expect(Object.keys(useSoundStore.getState().sounds)).toEqual(before);
    expect(useSoundLibraryStore.getState().importing).toBe(false);
  });

  it('preserves record, selection, volume, and transport when delete fails', async () => {
    const imported = record();
    useSoundLibraryStore.setState({ records: [imported] });
    const soundStore = useSoundStore.getState();
    soundStore.register([userId]);
    soundStore.select(userId);
    soundStore.setVolume(userId, 0.73);
    soundStore.play();
    nativeMocks.deleteImportedSound.mockRejectedValue(
      new Error('Could not delete the imported sound'),
    );

    await expect(
      useSoundLibraryStore.getState().removeSound(userId),
    ).rejects.toThrow('Could not delete');

    expect(useSoundLibraryStore.getState().records).toEqual([imported]);
    expect(useSoundLibraryStore.getState().pendingIds).toEqual([]);
    expect(useSoundStore.getState().sounds[userId]).toEqual(
      expect.objectContaining({ isSelected: true, volume: 0.73 }),
    );
    expect(useSoundStore.getState().isPlaying).toBe(true);
  });

  it('removes the local record only after native deletion succeeds', async () => {
    useSoundLibraryStore.setState({ records: [record()] });
    useSoundStore.getState().register([userId]);
    useSoundStore.getState().select(userId);

    await useSoundLibraryStore.getState().removeSound(userId);

    expect(nativeMocks.deleteImportedSound).toHaveBeenCalledWith(userId);
    expect(useSoundLibraryStore.getState().records).toEqual([]);
    expect(useSoundStore.getState().sounds[userId]).toBeUndefined();
    expect(useSoundLibraryStore.getState().pendingIds).toEqual([]);
  });
});
