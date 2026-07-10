import { useState, type FormEvent } from 'react';

import { cn } from '@/helpers/styles';
import { useSoundStore } from '@/stores/sound';
import { usePresetStore } from '@/stores/preset';
import { captureMixSnapshot } from '@/lib/mix-snapshot';

import styles from './new.module.css';

export function New() {
  const [name, setName] = useState('');

  const noSelected = useSoundStore(state => state.noSelected());
  const addPreset = usePresetStore(state => state.addPreset);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name || noSelected) return;

    addPreset(name, captureMixSnapshot());

    setName('');
  };

  return (
    <div className={styles.new}>
      <h3 className={styles.title}>New Preset</h3>

      <form
        className={cn(styles.form, noSelected && styles.disabled)}
        onSubmit={handleSubmit}
      >
        <input
          disabled={noSelected}
          placeholder="Preset's Name"
          required
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button disabled={noSelected}>Save</button>
      </form>

      {noSelected && (
        <p className={styles.noSelected}>
          To make a preset, first select some sounds.
        </p>
      )}
    </div>
  );
}
