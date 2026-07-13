import { useEffect, useState, type ChangeEvent } from 'react';

function formatFrequency(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

function isPartialNumberInput(value: string): boolean {
  return value === '' || /^\d*\.?\d*$/.test(value);
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

    if (isPartialNumberInput(next)) {
      setDraft(next);
    }
  };

  const commit = () => {
    const parsed = Number.parseFloat(draft);

    if (!Number.isFinite(parsed)) {
      setDraft(formatFrequency(value));
      return;
    }

    const clamped = Math.min(Math.max(parsed, min), max);
    onCommit(clamped);
    setDraft(formatFrequency(clamped));
  };

  return (
    <label>
      {label}
      <input
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
    </label>
  );
}
