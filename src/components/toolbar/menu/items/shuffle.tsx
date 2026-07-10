import { BiShuffle } from 'react-icons/bi';

import { useSoundStore } from '@/stores/sound';
import { useShuffleSounds } from '@/hooks/use-shuffle-sounds';

import { Item } from '../item';

export function Shuffle() {
  const shuffle = useShuffleSounds();
  const locked = useSoundStore(state => state.locked);

  return (
    <Item
      disabled={locked}
      icon={<BiShuffle />}
      label="Shuffle Sounds"
      onClick={shuffle}
    />
  );
}
