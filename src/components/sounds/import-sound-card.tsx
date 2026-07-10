import { IoAdd } from 'react-icons/io5';

import { useSnackbar } from '@/contexts/snackbar';
import { useSoundLibraryStore } from '@/stores/sound-library';
import { cn } from '@/helpers/styles';

import soundStyles from './sound/sound.module.css';
import styles from './import-sound-card.module.css';

export function ImportSoundCard() {
  const importing = useSoundLibraryStore(state => state.importing);
  const importSound = useSoundLibraryStore(state => state.importSound);
  const showSnackbar = useSnackbar();

  const handleImport = async () => {
    try {
      const sound = await importSound();
      if (sound) showSnackbar(`${sound.label} added to My Sounds.`);
    } catch (error) {
      showSnackbar(
        error instanceof Error ? error.message : 'Could not import the sound.',
      );
    }
  };

  return (
    <button
      aria-label="Add your own sound"
      className={cn(soundStyles.sound, styles.card)}
      disabled={importing}
      type="button"
      onClick={() => void handleImport()}
    >
      <div className={soundStyles.icon}>
        <span aria-hidden="true" className={styles.addIcon}>
          <IoAdd />
        </span>
      </div>
      <div className={soundStyles.label}>
        {importing ? 'Importing…' : 'Add Sound'}
      </div>
    </button>
  );
}
