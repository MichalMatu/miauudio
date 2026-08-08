import { Modal } from '@/components/modal';
import { FrequencyInput } from '@/components/modals/generator';
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
            <FrequencyInput
              label="Base frequency (Hz)"
              max={2000}
              min={settings.beatFrequency / 2 + 0.1}
              value={settings.baseFrequency}
              onCommit={baseFrequency => {
                setSettings('binaural', { baseFrequency, preset: 'custom' });
              }}
            />
          </div>
          <div className={styles.fieldWrapper}>
            <FrequencyInput
              label="Beat frequency (Hz)"
              max={40}
              min={0.1}
              value={settings.beatFrequency}
              onCommit={beatFrequency => {
                setSettings('binaural', { beatFrequency, preset: 'custom' });
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
