import { useCallback, useEffect, forwardRef, useMemo } from 'react';
import { ImSpinner9 } from 'react-icons/im';

import { Range } from './range';
import { Favorite } from './favorite';
import { Playback } from './playback';
import { UserSoundActions } from './user-actions';

import { SoundIcon } from '@/components/sound-icon';
import { useSoundStore } from '@/stores/sound';
import { useSettingsStore } from '@/stores/settings';
import { useLoadingStore } from '@/stores/loading';
import { cn } from '@/helpers/styles';

import styles from './sound.module.css';

import type { Sound as SoundType } from '@/data/types';

import { useKeyboardButton } from '@/hooks/use-keyboard-button';

type SoundProps = SoundType & {
  functional: boolean;
  hidden: boolean;
  selectHidden: (key: string) => void;
  unselectHidden: (key: string) => void;
};

export const Sound = forwardRef<HTMLDivElement, SoundProps>(
  function Sound(props, ref) {
    const {
      functional,
      hidden,
      icon,
      id,
      label,
      selectHidden,
      unselectHidden,
    } = props;
    const isPlaying = useSoundStore(state => state.isPlaying);
    const play = useSoundStore(state => state.play);
    const selectSound = useSoundStore(state => state.select);
    const unselectSound = useSoundStore(state => state.unselect);
    const setVolume = useSoundStore(state => state.setVolume);
    const soundState = useSoundStore(state => state.sounds[id]);
    const isSelected = soundState.isSelected;
    const locked = useSoundStore(state => state.locked);

    const volume = soundState.volume;
    const globalVolume = useSettingsStore(state => state.globalVolume);
    const adjustedVolume = useMemo(
      () => volume * globalVolume,
      [volume, globalVolume],
    );

    const loadingKey =
      props.kind === 'file'
        ? props.source.kind === 'asset'
          ? props.source.path
          : props.source.fileId
        : undefined;
    const isLoading = useLoadingStore(state =>
      loadingKey ? state.loaders[loadingKey] : false,
    );

    useEffect(() => {
      if (hidden && isSelected) selectHidden(label);
      else if (hidden && !isSelected) unselectHidden(label);
    }, [label, isSelected, hidden, selectHidden, unselectHidden]);

    const select = useCallback(() => {
      if (locked) return;
      selectSound(id);
      play();
    }, [selectSound, play, id, locked]);

    const unselect = useCallback(() => {
      if (locked) return;
      unselectSound(id);
      setVolume(id, 0.5);
    }, [unselectSound, setVolume, id, locked]);

    const toggle = useCallback(() => {
      if (locked) return;
      if (isSelected) unselect();
      else select();
    }, [isSelected, select, unselect, locked]);

    const handleClick = useCallback(() => {
      toggle();
    }, [toggle]);

    const handleKeyDown = useKeyboardButton(() => {
      toggle();
    });

    return (
      <>
        <Playback
          functional={functional}
          isPlaying={isPlaying}
          isSelected={isSelected}
          locked={locked}
          sound={props}
          volume={adjustedVolume}
        />
        <div
          aria-label={`${label} sound`}
          ref={ref}
          role="button"
          tabIndex={0}
          className={cn(
            styles.sound,
            isSelected && styles.selected,
            hidden && styles.hidden,
          )}
          onClick={event => {
            handleClick();
            event.currentTarget.blur();
          }}
          onKeyDown={handleKeyDown}
        >
          {props.origin === 'user' && (
            <UserSoundActions id={id} label={label} />
          )}
          <Favorite id={id} label={label} />
          <div className={styles.icon}>
            {isLoading ? (
              <span aria-hidden="true" className={styles.spinner}>
                <ImSpinner9 />
              </span>
            ) : (
              <span aria-hidden="true">
                <SoundIcon id={icon} />
              </span>
            )}
          </div>
          <div className={styles.label} id={id}>
            {label}
          </div>
          <Range id={id} label={label} />
        </div>
      </>
    );
  },
);
