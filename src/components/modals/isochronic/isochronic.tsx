import type { ChangeEvent } from 'react';

import { Modal } from '@/components/modal';
import {
  GENERATOR_PRESETS,
  useGeneratorStore,
  type GeneratorPresetId,
} from '@/stores/generator';

import styles from './isochornic.module.css';

interface IsochronicProps {
  onClose: () => void;
  show: boolean;
}

export function IsochronicModal({ onClose, show }: IsochronicProps) {
  const settings = useGeneratorStore(state => state.settings.isochronic);
  const setSettings = useGeneratorStore(state => state.setSettings);

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const presetId = event.target.value as GeneratorPresetId;

    if (presetId === 'custom') {
      setSettings('isochronic', { preset: 'custom' });
      return;
    }

    const preset = GENERATOR_PRESETS.find(item => item.id === presetId);
    if (!preset) return;

    setSettings('isochronic', {
      baseFrequency: preset.baseFrequency,
      beatFrequency: preset.beatFrequency,
      preset: preset.id,
    });
  };

  return (
    <Modal show={show} onClose={onClose}>
      <header className={styles.header}>
        <h2 className={styles.title}>Isochronic settings</h2>
        <p className={styles.desc}>
          Configure the isochronic layer. Changes apply while it is playing.
        </p>
      </header>

      <div className={styles.fieldWrapper}>
        <label>
          Preset
          <select value={settings.preset} onChange={handlePresetChange}>
            {GENERATOR_PRESETS.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>

      {settings.preset === 'custom' && (
        <>
          <div className={styles.fieldWrapper}>
            <label>
              Base frequency (Hz)
              <input
                max="2000"
                min="20"
                step="0.1"
                type="number"
                value={settings.baseFrequency}
                onChange={event => {
                  if (!Number.isFinite(event.target.valueAsNumber)) return;

                  setSettings('isochronic', {
                    baseFrequency: event.target.valueAsNumber,
                    preset: 'custom',
                  });
                }}
              />
            </label>
          </div>
          <div className={styles.fieldWrapper}>
            <label>
              Pulse frequency (Hz)
              <input
                max="40"
                min="0.1"
                step="0.1"
                type="number"
                value={settings.beatFrequency}
                onChange={event => {
                  if (!Number.isFinite(event.target.valueAsNumber)) return;

                  setSettings('isochronic', {
                    beatFrequency: event.target.valueAsNumber,
                    preset: 'custom',
                  });
                }}
              />
            </label>
          </div>
        </>
      )}
    </Modal>
  );
}
