import { useEffect } from 'react';

import { useSoundStore } from '@/stores/sound';
import { useSettingsStore } from '@/stores/settings';
import { useNoteStore } from '@/stores/note';
import { usePresetStore } from '@/stores/preset';
import { useTodoStore } from '@/stores/todo';
import { useGeneratorStore } from '@/stores/generator';

interface StoreConsumerProps {
  children: React.ReactNode;
}

export function StoreConsumer({ children }: StoreConsumerProps) {
  useEffect(() => {
    useSoundStore.persist.rehydrate();
    useSettingsStore.persist.rehydrate();
    useNoteStore.persist.rehydrate();
    usePresetStore.persist.rehydrate();
    useTodoStore.persist.rehydrate();
    useGeneratorStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
