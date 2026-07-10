import { useState, useEffect } from 'react';

import { Modal } from '@/components/modal';

import { useSnackbar } from '@/contexts/snackbar';
import { useCloseListener } from '@/hooks/use-close-listener';
import { cn } from '@/helpers/styles';
import { sounds } from '@/data/sounds';
import {
  applyMixSnapshot,
  parseSharedMixPayload,
  type MixSnapshot,
} from '@/lib/mix-snapshot';

import styles from './shared.module.css';

export function SharedModal() {
  const showSnackbar = useSnackbar();

  const [isOpen, setIsOpen] = useState(false);
  const [sharedMix, setSharedMix] = useState<MixSnapshot | null>(null);
  const [sharedSounds, setSharedSounds] = useState<
    Array<{
      id: string;
      label: string;
    }>
  >([]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const share = searchParams.get('share');

    if (share) {
      try {
        const parsed = parseSharedMixPayload(JSON.parse(share));
        if (!parsed) return;

        const allSounds: Record<string, string> = {};

        sounds.categories.forEach(category => {
          category.sounds.forEach(sound => {
            allSounds[sound.id] = sound.label;
          });
        });

        const _sharedSounds: Array<{
          id: string;
          label: string;
        }> = [];

        Object.keys(parsed.sounds).forEach(sound => {
          if (allSounds[sound]) {
            _sharedSounds.push({
              id: sound,
              label: allSounds[sound],
            });
          }
        });

        if (_sharedSounds.length) {
          setIsOpen(true);
          setSharedMix(parsed);
          setSharedSounds(_sharedSounds);
        }
      } catch {
        return;
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete('share');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const handleOverride = () => {
    if (!sharedMix) return;

    applyMixSnapshot(sharedMix, { autoplay: false });
    setIsOpen(false);
    showSnackbar('Done! You can now play the new selection.');
  };

  useCloseListener(() => setIsOpen(false));

  return (
    <Modal show={isOpen} onClose={() => setIsOpen(false)}>
      <h1 className={styles.heading}>New sound mix detected!</h1>
      <p className={styles.desc}>
        Someone has shared the following mix with you. Would you want to
        override your current selection?
      </p>
      <div className={styles.sounds}>
        {sharedSounds.map(sound => (
          <div className={styles.sound} key={sound.id}>
            {sound.label}
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <button className={cn(styles.button)} onClick={() => setIsOpen(false)}>
          Cancel
        </button>
        <button
          className={cn(styles.button, styles.primary)}
          onClick={handleOverride}
        >
          Override
        </button>
      </div>
    </Modal>
  );
}
