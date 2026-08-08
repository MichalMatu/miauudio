import { Modal } from '@/components/modal';
import { FrequencyInput } from '@/components/modals/generator';
import { Select } from '@/components/select';
import {
  GENERATOR_PRESET_OPTIONS,
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

  const handlePresetChange = (presetId: GeneratorPresetId) => {
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
        <label className={styles.fieldLabel} htmlFor="isochronic-preset">
          Preset
        </label>
        <Select
          ariaLabel="Isochronic preset"
          className={styles.select}
          id="isochronic-preset"
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
              min={20}
              value={settings.baseFrequency}
              onCommit={baseFrequency => {
                setSettings('isochronic', { baseFrequency, preset: 'custom' });
              }}
            />
          </div>
          <div className={styles.fieldWrapper}>
            <FrequencyInput
              label="Pulse frequency (Hz)"
              max={40}
              min={0.1}
              value={settings.beatFrequency}
              onCommit={beatFrequency => {
                setSettings('isochronic', { beatFrequency, preset: 'custom' });
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
