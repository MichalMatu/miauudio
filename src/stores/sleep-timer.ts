import { create } from 'zustand';

interface SleepTimerStore {
  clear: () => void;
  endsAt: number | null;
  start: (endsAt: number, startedAt?: number) => void;
  startedAt: number | null;
  synchronize: (endsAt: number | null) => void;
}

export const useSleepTimerStore = create<SleepTimerStore>()(set => ({
  clear() {
    set({ endsAt: null, startedAt: null });
  },
  endsAt: null,
  start(endsAt, startedAt = Date.now()) {
    set({ endsAt, startedAt });
  },
  startedAt: null,
  synchronize(endsAt) {
    set(state => {
      if (endsAt === null) {
        if (state.endsAt === null) return state;

        return { endsAt: null, startedAt: null };
      }
      if (state.endsAt === endsAt) return state;

      return { endsAt, startedAt: Date.now() };
    });
  },
}));
