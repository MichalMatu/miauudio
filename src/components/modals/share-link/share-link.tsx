import { useMemo, useEffect, useState } from 'react';
import { IoCopyOutline, IoCheckmark } from 'react-icons/io5';

import { Modal } from '@/components/modal';

import { useCopy } from '@/hooks/use-copy';
import { useSoundStore } from '@/stores/sound';
import { useGeneratorStore } from '@/stores/generator';
import { captureMixSnapshot, createSharedMixPayload } from '@/lib/mix-snapshot';

import styles from './share-link.module.css';

interface ShareLinkModalProps {
  onClose: () => void;
  show: boolean;
}

export function ShareLinkModal({ onClose, show }: ShareLinkModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const sounds = useSoundStore(state => state.sounds);
  const generatorSettings = useGeneratorStore(state => state.settings);
  const { copy, copying } = useCopy();

  const string = useMemo(() => {
    const snapshot = captureMixSnapshot();

    return JSON.stringify(createSharedMixPayload(snapshot));
  }, [sounds, generatorSettings]);

  const url = useMemo(() => {
    const path = `/?share=${encodeURIComponent(string)}`;

    if (!isMounted) return path;

    return new URL(path, window.location.origin).toString();
  }, [string, isMounted]);

  useEffect(() => setIsMounted(true), []);

  return (
    <Modal show={show} onClose={onClose}>
      <h1 className={styles.heading}>Share your sound selection!</h1>
      <p className={styles.desc}>
        Copy and send the following link to the person you want to share your
        selection with.
      </p>
      <div className={styles.inputWrapper}>
        <input readOnly type="text" value={url} />
        <button aria-label="Copy share link" onClick={() => copy(url)}>
          {copying ? <IoCheckmark /> : <IoCopyOutline />}
        </button>
      </div>
    </Modal>
  );
}
