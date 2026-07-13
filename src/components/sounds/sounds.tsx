import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { AnimatePresence, motion } from 'motion/react';

import { Sound } from './sound';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { cn } from '@/helpers/styles';
import styles from './sounds.module.css';

const showMoreTransition = { duration: 0.2, ease: 'easeOut' as const };

import type { Sounds } from '@/data/types';

interface SoundsProps {
  action?: React.ReactNode;
  functional: boolean;
  id: string;
  sounds: Sounds;
}

export function Sounds({ action, functional, id, sounds }: SoundsProps) {
  const [soundsRef] = useAutoAnimate<HTMLDivElement>({ duration: 250 });
  const [showAll, setShowAll] = useLocalStorage(`${id}-show-more`, false);
  const [clickedMore, setClickedMore] = useState(false);

  const [isAnimating, setIsAnimating] = useState(false);

  const firstNewSound = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAll && clickedMore) {
      firstNewSound.current?.focus();
      setClickedMore(false);
    }
  }, [showAll, clickedMore]);

  const showMoreButton = useRef<HTMLButtonElement>(null);

  const [hiddenSelections, setHiddenSelections] = useState<{
    [key: string]: boolean;
  }>({});

  const hasHiddenSelection = useMemo(() => {
    const keys = Object.keys(hiddenSelections);

    return keys.some(key => hiddenSelections[key]);
  }, [hiddenSelections]);

  const selectHidden = useCallback((key: string) => {
    setHiddenSelections(prev => ({
      ...prev,
      [key]: true,
    }));
  }, []);

  const unselectHidden = useCallback((key: string) => {
    setHiddenSelections(prev => ({
      ...prev,
      [key]: false,
    }));
  }, []);

  const toggleMore = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setShowAll(prev => !prev);
    setClickedMore(true);
    window.setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <div>
      <div ref={soundsRef} className={styles.sounds}>
        {action}

        {sounds.map((sound, index) => (
          <Sound
            key={sound.id}
            {...sound}
            functional={functional}
            hidden={!showAll && index > 5}
            ref={index === 6 ? firstNewSound : undefined}
            selectHidden={selectHidden}
            unselectHidden={unselectHidden}
          />
        ))}

        {sounds.length + (action ? 1 : 0) < 2 &&
          new Array(2 - sounds.length - (action ? 1 : 0))
            .fill(null)
            .map((_, index) => <div key={index} />)}
      </div>

      {sounds.length > 6 && (
        <button
          ref={showMoreButton}
          className={cn(
            styles.button,
            hasHiddenSelection && !showAll && styles.active,
          )}
          onClick={event => {
            toggleMore();
            event.currentTarget.blur();
          }}
        >
          <span className={styles.buttonLabel}>
            <AnimatePresence initial={false} mode="sync">
              <motion.span
                animate={{ opacity: 1 }}
                className={styles.buttonText}
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={showAll ? `${id}-show-less` : `${id}-show-more`}
                transition={showMoreTransition}
              >
                {showAll ? 'Show Less' : 'Show More'}
              </motion.span>
            </AnimatePresence>
          </span>
        </button>
      )}
    </div>
  );
}
