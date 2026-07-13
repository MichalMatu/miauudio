import { Modal } from '@/components/modal';
import { FrequencyInput } from '@/components/modals/generator';
import { Select } from '@/components/select';
import { Slider } from '@/components/slider';
import {
  PHASE_PRESET_OPTIONS,
  PHASE_PRESETS,
  useGeneratorStore,
  type GeneratorPresetId,
} from '@/stores/generator';

import styles from './phase.module.css';

interface PhaseModalProps {
  onClose: () => void;
  show: boolean;
}

export function PhaseModal({ onClose, show }: PhaseModalProps) {
  const settings = useGeneratorStore(state => state.settings.phase);
  const setSettings = useGeneratorStore(state => state.setSettings);

  const handlePresetChange = (presetId: GeneratorPresetId) => {
    if (presetId === 'custom') {
      setSettings('phase', { preset: 'custom' });
      return;
    }

    const preset = PHASE_PRESETS.find(item => item.id === presetId);
    if (!preset) return;

    setSettings('phase', {
      baseFrequency: preset.baseFrequency,
      phaseOffset: preset.phaseOffset,
      preset: preset.id,
      rotationSpeed: preset.rotationSpeed,
    });
  };

  return (
    <Modal show={show} onClose={onClose}>
      <header className={styles.header}>
        <h2 className={styles.title}>Phase settings</h2>
        <p className={styles.desc}>
          Use headphones. Slow movement of the tone between your ears — subtle,
          not 3D surround.
        </p>
      </header>

      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel} htmlFor="phase-spatial-depth">
          Spatial depth ({Math.round(settings.spatialDepth)}%)
        </label>
        <Slider
          max={100}
          min={0}
          step={1}
          value={settings.spatialDepth}
          onChange={spatialDepth => {
            setSettings('phase', { spatialDepth });
          }}
        />
      </div>

      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel} htmlFor="phase-preset">
          Preset
        </label>
        <Select
          ariaLabel="Phase preset"
          className={styles.select}
          id="phase-preset"
          options={PHASE_PRESET_OPTIONS}
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
                setSettings('phase', { baseFrequency, preset: 'custom' });
              }}
            />
          </div>
          <div className={styles.fieldWrapper}>
            <FrequencyInput
              label="Phase offset (°)"
              max={360}
              min={0}
              step={1}
              value={settings.phaseOffset}
              onCommit={phaseOffset => {
                setSettings('phase', { phaseOffset, preset: 'custom' });
              }}
            />
          </div>
          <div className={styles.fieldWrapper}>
            <FrequencyInput
              label="Rotation speed (Hz)"
              max={40}
              min={0}
              value={settings.rotationSpeed}
              onCommit={rotationSpeed => {
                setSettings('phase', { preset: 'custom', rotationSpeed });
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
