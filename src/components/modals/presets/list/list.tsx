import { FaPlay, FaRegTrashAlt } from 'react-icons/fa';

import styles from './list.module.css';

import { usePresetStore } from '@/stores/preset';
import { applyMixSnapshot } from '@/lib/mix-snapshot';

interface ListProps {
  close: () => void;
}

export function List({ close }: ListProps) {
  const presets = usePresetStore(state => state.presets);
  const changeName = usePresetStore(state => state.changeName);
  const deletePreset = usePresetStore(state => state.deletePreset);

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
              applyMixSnapshot(preset.snapshot, { autoplay: true });
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
