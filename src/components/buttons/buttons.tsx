import { LayoutGroup, motion } from 'motion/react';

import { PlayButton } from './play';
import { UnselectButton } from './unselect';

import styles from './buttons.module.css';

export function Buttons() {
  return (
    <LayoutGroup>
      <div className={styles.buttons}>
        <motion.div layout>
          <PlayButton />
        </motion.div>
        <UnselectButton />
      </div>
    </LayoutGroup>
  );
}
