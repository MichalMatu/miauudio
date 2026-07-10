import { Modal } from '@/components/modal';
import { Select } from '@/components/select';
import {
  GENERATOR_PRESET_OPTIONS,
  GENERATOR_PRESETS,
  useGeneratorStore,
  type GeneratorPresetId,
} from '@/stores/generator';

import styles from './binaural.module.css';

interface BinauralProps {
  onClose: () => void;
  show: boolean;
}

export function BinauralModal({ onClose, show }: BinauralProps) {
  const settings = useGeneratorStore(state => state.settings.binaural);
  const setSettings = useGeneratorStore(state => state.setSettings);

  const handlePresetChange = (presetId: GeneratorPresetId) => {
    if (presetId === 'custom') {
      setSettings('binaural', { preset: 'custom' });
      return;
    }

    const preset = GENERATOR_PRESETS.find(item => item.id === presetId);
    if (!preset) return;

    setSettings('binaural', {
      baseFrequency: preset.baseFrequency,
      beatFrequency: preset.beatFrequency,
      preset: preset.id,
    });
  };

  return (
    <Modal show={show} onClose={onClose}>
      <header className={styles.header}>
        <h2 className={styles.title}>Binaural settings</h2>
        <p className={styles.desc}>
          Configure the binaural layer. Use headphones to hear the stereo beat.
        </p>
      </header>

      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel} htmlFor="binaural-preset">
          Preset
        </label>
        <Select
          ariaLabel="Binaural preset"
          className={styles.select}
          id="binaural-preset"
          options={GENERATOR_PRESET_OPTIONS}
          value={settings.preset}
          onValueChange={handlePresetChange}
        />
      </div>

      {settings.preset === 'custom' && (
        <>
          <div className={styles.fieldWrapper}>
            <label>
              Base frequency (Hz)
              <input
                max="2000"
                min="20.1"
                step="0.1"
                type="number"
                value={settings.baseFrequency}
                onChange={event => {
                  if (!Number.isFinite(event.target.valueAsNumber)) return;

                  setSettings('binaural', {
                    baseFrequency: event.target.valueAsNumber,
                    preset: 'custom',
                  });
                }}
              />
            </label>
          </div>
          <div className={styles.fieldWrapper}>
            <label>
              Beat frequency (Hz)
              <input
                max="40"
                min="0.1"
                step="0.1"
                type="number"
                value={settings.beatFrequency}
                onChange={event => {
                  if (!Number.isFinite(event.target.valueAsNumber)) return;

                  setSettings('binaural', {
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
