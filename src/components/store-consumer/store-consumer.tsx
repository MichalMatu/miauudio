import { useEffect, useState } from 'react';

import { IS_NATIVE_APP } from '@/constants/app';
import { useSoundStore } from '@/stores/sound';
import { useSettingsStore } from '@/stores/settings';
import { useNoteStore } from '@/stores/note';
import { usePresetStore } from '@/stores/preset';
import { useTodoStore } from '@/stores/todo';
import { useGeneratorStore } from '@/stores/generator';
import { useSoundLibraryStore } from '@/stores/sound-library';

import styles from './store-consumer.module.css';

interface StoreConsumerProps {
  children: React.ReactNode;
}

export function StoreConsumer({ children }: StoreConsumerProps) {
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [startupError, setStartupError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        setReady(false);
        setStartupError(false);

        const criticalResults = await Promise.allSettled([
          useSoundStore.persist.rehydrate(),
          useSettingsStore.persist.rehydrate(),
          useGeneratorStore.persist.rehydrate(),
        ]);
        const criticalFailure = criticalResults.find(
          result => result.status === 'rejected',
        );

        if (criticalFailure?.status === 'rejected') {
          throw criticalFailure.reason;
        }

        let libraryError: unknown = null;

        if (IS_NATIVE_APP) {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              await useSoundLibraryStore.getState().initialize();
              libraryError = null;
              break;
            } catch (error) {
              libraryError = error;
              if (attempt < 2) {
                await new Promise(resolve =>
                  setTimeout(resolve, 150 * (attempt + 1)),
                );
              }
            }
          }
        }

        if (libraryError) throw libraryError;

        const secondaryResults = await Promise.allSettled([
          useNoteStore.persist.rehydrate(),
          usePresetStore.persist.rehydrate(),
          useTodoStore.persist.rehydrate(),
        ]);
        secondaryResults.forEach(result => {
          if (result.status === 'rejected') {
            console.error(
              'Could not restore a non-audio application store.',
              result.reason,
            );
          }
        });

        if (!mounted) return;

        setReady(true);
      } catch (error) {
        console.error('Could not restore critical audio state.', error);
        if (mounted) setStartupError(true);
      }
    };

    void hydrate();

    return () => {
      mounted = false;
    };
  }, [retry]);

  if (startupError) {
    return (
      <main className={styles.error} role="alert">
        <div className={styles.panel}>
          <h1 className={styles.title}>Miauudio could not start</h1>
          <p className={styles.description}>
            Your audio state could not be restored. No files were changed.
          </p>
          <button
            className={styles.button}
            type="button"
            onClick={() => setRetry(value => value + 1)}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!ready) return null;

  return <>{children}</>;
}
