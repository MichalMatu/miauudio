import { useEffect, useState, type ChangeEvent } from 'react';

import styles from './frequency-input.module.css';

function formatFrequency(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

function isPartialNumberInput(value: string): boolean {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

function shouldLiveCommit(draft: string): boolean {
  return draft !== '' && !draft.endsWith('.');
}

function clampFrequency(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface FrequencyInputProps {
  id?: string;
  label: string;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  step?: number;
  value: number;
}

export function FrequencyInput({
  id,
  label,
  max,
  min,
  onCommit,
  step = 0.1,
  value,
}: FrequencyInputProps) {
  const [draft, setDraft] = useState(() => formatFrequency(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatFrequency(value));
    }
  }, [focused, value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;

    if (!isPartialNumberInput(next)) return;

    setDraft(next);

    if (!shouldLiveCommit(next)) return;

    const parsed = Number.parseFloat(next);
    if (!Number.isFinite(parsed)) return;

    onCommit(clampFrequency(parsed, min, max));
  };

  const commit = () => {
    const parsed = Number.parseFloat(draft);

    if (!Number.isFinite(parsed)) {
      setDraft(formatFrequency(value));
      return;
    }

    const clamped = clampFrequency(parsed, min, max);
    onCommit(clamped);
    setDraft(formatFrequency(clamped));
  };

  const rangeLabel = `${formatFrequency(min)}–${formatFrequency(max)}`;

  return (
    <label className={styles.label}>
      <span className={styles.labelText}>{label}</span>
      <div className={styles.inputWrapper}>
        <input
          aria-describedby={id ? `${id}-range` : undefined}
          className={styles.input}
          enterKeyHint="done"
          id={id}
          inputMode="decimal"
          max={max}
          min={min}
          step={step}
          type="text"
          value={draft}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
        />
        <span
          aria-hidden="true"
          className={styles.range}
          id={id ? `${id}-range` : undefined}
        >
          {rangeLabel}
        </span>
      </div>
    </label>
  );
}
