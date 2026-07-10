import { BiShuffle } from 'react-icons/bi';

import { Tooltip } from '@/components/tooltip';
import { useShuffleSounds } from '@/hooks/use-shuffle-sounds';

import styles from './shuffle.module.css';

export function Shuffle() {
  const shuffle = useShuffleSounds();

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip content="Shuffle sounds">
        <button
          aria-label="Shuffle sounds"
          className={styles.button}
          onClick={shuffle}
        >
          <BiShuffle />
        </button>
      </Tooltip>
    </Tooltip.Provider>
  );
}
