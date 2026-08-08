import { FaPlay, FaRegTrashAlt } from 'react-icons/fa';

import styles from './list.module.css';

import { usePresetStore } from '@/stores/preset';
import { applyMixSnapshot } from '@/lib/mix-snapshot';
import { useSnackbar } from '@/contexts/snackbar';

interface ListProps {
  close: () => void;
}

export function List({ close }: ListProps) {
  const presets = usePresetStore(state => state.presets);
  const changeName = usePresetStore(state => state.changeName);
  const deletePreset = usePresetStore(state => state.deletePreset);
  const showSnackbar = useSnackbar();

  return (
    <div className={styles.list}>
      <h3 className={styles.title}>
        Your Presets {presets.length > 0 && `(${presets.length})`}
      </h3>

      {!presets.length && (
        <p className={styles.empty}>You don&apos;t have any presets yet.</p>
      )}

      {presets.map(preset => (
        <div className={styles.preset} key={preset.id}>
          <input
            placeholder="Untitled"
            type="text"
            value={preset.label}
            onChange={e => changeName(preset.id, e.target.value)}
          />
          <button onClick={() => deletePreset(preset.id)}>
            <FaRegTrashAlt />
          </button>
          <button
            className={styles.primary}
            onClick={() => {
              const result = applyMixSnapshot(preset.snapshot, {
                autoplay: true,
              });

              if (!result.appliedIds.length) {
                showSnackbar(
                  'No sounds from this preset are available on this device.',
                );
                return;
              }
              if (result.missingIds.length) {
                showSnackbar(
                  `${result.missingIds.length} unavailable preset ${
                    result.missingIds.length === 1 ? 'sound was' : 'sounds were'
                  } skipped.`,
                );
              }
              close();
            }}
          >
            <FaPlay />
          </button>
        </div>
      ))}
    </div>
  );
}
