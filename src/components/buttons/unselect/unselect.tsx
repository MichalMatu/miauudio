import { useCallback } from 'react';
import { BiUndo, BiTrash } from 'react-icons/bi';
import { AnimatePresence, motion } from 'motion/react';
import { useHotkeys } from 'react-hotkeys-hook';

import { Tooltip } from '@/components/tooltip';

import { useFinePointer } from '@/hooks/use-fine-pointer';
import { useSoundStore } from '@/stores/sound';
import { cn } from '@/helpers/styles';

import styles from './unselect.module.css';

const UNSELECT_BUTTON_SIZE = 45;
const UNSELECT_BUTTON_GAP = 10;

const transition = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1] as const,
};

const variants = {
  exit: {
    marginLeft: 0,
    opacity: 0,
    width: 0,
    x: 8,
  },
  hidden: {
    marginLeft: 0,
    opacity: 0,
    width: 0,
    x: 8,
  },
  show: {
    marginLeft: UNSELECT_BUTTON_GAP,
    opacity: 1,
    width: UNSELECT_BUTTON_SIZE,
    x: 0,
  },
};

export function UnselectButton() {
  const hasFinePointer = useFinePointer();
  const noSelected = useSoundStore(state => state.noSelected());
  const restoreHistory = useSoundStore(state => state.restoreHistory);
  const hasHistory = useSoundStore(state => !!state.history);
  const unselectAll = useSoundStore(state => state.unselectAll);
  const locked = useSoundStore(state => state.locked);

  const handleToggle = useCallback(() => {
    if (locked) return;
    if (hasHistory) restoreHistory();
    else if (!noSelected) unselectAll(true);
  }, [hasHistory, noSelected, unselectAll, restoreHistory, locked]);

  useHotkeys('shift+r', handleToggle, {}, [handleToggle]);

  const tooltipLabel = hasHistory
    ? 'Restore unselected sounds.'
    : 'Unselect all sounds.';

  const button = (
    <button
      disabled={noSelected && !hasHistory}
      aria-label={
        hasHistory ? 'Restore Unselected Sounds' : 'Unselect All Sounds'
      }
      className={cn(
        styles.unselectButton,
        noSelected && !hasHistory && styles.disabled,
      )}
      onClick={event => {
        handleToggle();
        event.currentTarget.blur();
      }}
    >
      {hasHistory ? <BiUndo /> : <BiTrash />}
    </button>
  );

  return (
    <AnimatePresence initial={false}>
      {(!noSelected || hasHistory) && (
        <motion.div
          animate="show"
          className={styles.wrapper}
          exit="exit"
          initial="hidden"
          layout
          transition={transition}
          variants={variants}
        >
          {hasFinePointer ? (
            <Tooltip.Provider delayDuration={0}>
              <Tooltip content={tooltipLabel}>{button}</Tooltip>
            </Tooltip.Provider>
          ) : (
            button
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
