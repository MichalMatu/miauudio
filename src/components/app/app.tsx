import { useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Howler } from 'howler';

import { useSoundStore } from '@/stores/sound';
import {
  toUserSoundDefinition,
  useSoundLibraryStore,
} from '@/stores/sound-library';

import { Container } from '@/components/container';
import { StoreConsumer } from '@/components/store-consumer';
import { Buttons } from '@/components/buttons';
import CategoryIcons from '@/components/categories/category-icons/category-icons';
import { Categories, type DisplayCategory } from '@/components/categories';
import { ImportSoundCard } from '@/components/sounds';
import { SharedModal } from '@/components/modals/shared';
import { Toolbar } from '@/components/toolbar';
import { SnackbarProvider } from '@/contexts/snackbar';
import { MediaControls } from '@/components/media-controls';
import { NativeAudioController } from '@/components/native-audio-controller';
import { NativeBackHandler } from './native-back-handler';

import { IS_NATIVE_APP } from '@/constants/app';
import { bundledCategories } from '@/data/sounds';
import { FADE_OUT } from '@/constants/events';

import { subscribe } from '@/lib/event';
import { usePreventTextSelection } from '@/hooks/use-prevent-text-selection';

export function App() {
  usePreventTextSelection();
  const records = useSoundLibraryStore(state => state.records);
  const userSounds = useMemo(
    () => records.map(toUserSoundDefinition),
    [records],
  );
  const allSounds = useMemo(
    () => [
      ...userSounds,
      ...bundledCategories.flatMap(category => category.sounds),
    ],
    [userSounds],
  );

  const favorites = useSoundStore(useShallow(state => state.getFavorites()));
  const pause = useSoundStore(state => state.pause);
  const lock = useSoundStore(state => state.lock);
  const unlock = useSoundStore(state => state.unlock);

  const favoriteSounds = useMemo(() => {
    const soundsById = new Map(allSounds.map(sound => [sound.id, sound]));

    return favorites.flatMap(id => {
      const sound = soundsById.get(id);
      return sound ? [sound] : [];
    });
  }, [allSounds, favorites]);

  useEffect(() => {
    if (IS_NATIVE_APP) return;

    const onChange = () => {
      const { ctx } = Howler;

      if (ctx && !document.hidden) {
        setTimeout(() => {
          ctx.resume();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', onChange, false);

    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(FADE_OUT, (e: { duration: number }) => {
      lock();

      setTimeout(() => {
        pause();
        unlock();
      }, e.duration);
    });

    return unsubscribe;
  }, [pause, lock, unlock]);

  const allCategories = useMemo(() => {
    const categories: Array<DisplayCategory> = [];

    if (favoriteSounds.length) {
      categories.push({
        icon: 'BiSolidHeart',
        id: 'favorites',
        sounds: favoriteSounds,
        title: 'Favorites',
      });
    }

    if (IS_NATIVE_APP) {
      categories.push({
        action: <ImportSoundCard />,
        icon: 'IoMusicalNotes',
        id: 'my-sounds',
        sounds: userSounds,
        title: 'My Sounds',
      });
    }

    return [...categories, ...bundledCategories];
  }, [favoriteSounds, userSounds]);

  return (
    <SnackbarProvider>
      <NativeBackHandler />
      <StoreConsumer>
        <NativeAudioController ready sounds={allSounds} />
        <MediaControls />
        <CategoryIcons />
        <Container>
          <div id="app" />
          <Buttons />
          <Categories categories={allCategories} />
        </Container>

        <Toolbar />
        <SharedModal />
      </StoreConsumer>
    </SnackbarProvider>
  );
}
