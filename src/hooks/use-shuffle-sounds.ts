import { useCallback, useMemo } from 'react';

import { bundledCategories } from '@/data/sounds';
import { useSoundLibraryStore } from '@/stores/sound-library';
import { useSoundStore } from '@/stores/sound';

const BUNDLED_SHUFFLE_IDS = bundledCategories.flatMap(category =>
  category.sounds
    .filter(sound => sound.shuffleable !== false)
    .map(sound => sound.id),
);

export function useShuffleSounds() {
  const records = useSoundLibraryStore(state => state.records);
  const shuffle = useSoundStore(state => state.shuffle);
  const ids = useMemo(
    () => [...BUNDLED_SHUFFLE_IDS, ...records.map(record => record.id)],
    [records],
  );

  return useCallback(() => shuffle(ids), [ids, shuffle]);
}
