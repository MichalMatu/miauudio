import { useEffect, useMemo, useState } from 'react';

import { Modal } from '@/components/modal';
import { Timer } from './timer';
import { IS_NATIVE_APP } from '@/constants/app';
import { useSnackbar } from '@/contexts/snackbar';
import { dispatch } from '@/lib/event';
import { cancelSleepTimer, scheduleSleepTimer } from '@/lib/native-audio';
import { useSoundStore } from '@/stores/sound';
import { cn } from '@/helpers/styles';
import { FADE_OUT } from '@/constants/events';
import { useSleepTimerStore } from '@/stores/sleep-timer';

import styles from './sleep-timer.module.css';

interface SleepTimerModalProps {
  onClose: () => void;
  show: boolean;
}

export function SleepTimerModal({ onClose, show }: SleepTimerModalProps) {
  const endsAt = useSleepTimerStore(state => state.endsAt);
  const startedAt = useSleepTimerStore(state => state.startedAt);
  const clearTimer = useSleepTimerStore(state => state.clear);
  const startTimer = useSleepTimerStore(state => state.start);
  const noSelected = useSoundStore(state => state.noSelected());
  const showSnackbar = useSnackbar();
  const running = endsAt !== null;

  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('10');
  const [now, setNow] = useState(Date.now());
  const [scheduling, setScheduling] = useState(false);

  const totalSeconds = useMemo(
    () =>
      (hours === '' ? 0 : Number.parseInt(hours, 10)) * 3600 +
      (minutes === '' ? 0 : Number.parseInt(minutes, 10)) * 60,
    [hours, minutes],
  );

  const timeLeft = useMemo(
    () => (endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))),
    [endsAt, now],
  );

  const timeSpent = useMemo(
    () =>
      startedAt === null
        ? 0
        : Math.max(0, Math.floor((now - startedAt) / 1000)),
    [now, startedAt],
  );

  const isPlaying = useSoundStore(state => state.isPlaying);
  const play = useSoundStore(state => state.play);

  useEffect(() => {
    if (!running) return;

    setNow(Date.now());
    const timerId = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timerId);
  }, [running]);

  const handleStart = async () => {
    if (noSelected || totalSeconds <= 0 || scheduling) return;

    const startedAt = Date.now();
    const durationMs = totalSeconds * 1000;
    setScheduling(true);

    try {
      if (IS_NATIVE_APP) {
        const state = await scheduleSleepTimer({
          durationMs,
          fadeMs: 1000,
        });

        if (state.timerEndsAt === null) {
          throw new Error('The native timer was not scheduled.');
        }

        startTimer(state.timerEndsAt, startedAt);
      } else {
        startTimer(startedAt + durationMs, startedAt);
      }

      if (!isPlaying) play();
    } catch {
      showSnackbar('Could not start the sleep timer.');
    } finally {
      setScheduling(false);
    }
  };

  useEffect(() => {
    if (IS_NATIVE_APP || endsAt === null || timeLeft > 0) return;

    clearTimer();
    dispatch(FADE_OUT, { duration: 1000 });
  }, [clearTimer, endsAt, timeLeft]);

  const handleReset = async () => {
    try {
      if (IS_NATIVE_APP) await cancelSleepTimer();

      clearTimer();
      setHours('0');
      setMinutes('10');
    } catch {
      showSnackbar('Could not cancel the sleep timer.');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    handleStart();
  };

  return (
    <Modal show={show} onClose={onClose}>
      <header className={styles.header}>
        <h2 className={styles.title}>Sleep Timer</h2>
        <p className={styles.desc}>
          Stop sounds after a certain amount of time.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className={styles.controls}>
          <div className={styles.inputs}>
            {!running && (
              <Field label="Hours" value={hours} onChange={setHours} />
            )}

            {!running && (
              <Field label="Minutes" value={minutes} onChange={setMinutes} />
            )}
          </div>

          {running ? <Timer reverse={timeSpent} timer={timeLeft} /> : null}

          <div className={styles.buttons}>
            {running && (
              <button
                className={styles.button}
                type="button"
                onClick={() => void handleReset()}
              >
                Reset
              </button>
            )}

            {!running && (
              <button
                className={cn(styles.button, styles.primary)}
                disabled={scheduling}
                type="submit"
              >
                Start
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  onChange: (value: string) => void;
  value: string;
}

function Field({ label, onChange, value }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={label.toLocaleLowerCase()}>
        {label}
      </label>
      <input
        className={styles.input}
        id={label.toLocaleLowerCase()}
        max="59"
        min="0"
        required
        type="number"
        value={value}
        onChange={e => onChange(e.target.value === '' ? '' : e.target.value)}
      />
    </div>
  );
}
