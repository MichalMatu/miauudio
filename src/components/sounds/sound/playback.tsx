import { useCallback, useEffect } from 'react';

import { useGeneratorAudio } from '@/hooks/use-generator-audio';
import { useSound } from '@/hooks/use-sound';
import { useSnackbar } from '@/contexts/snackbar';
import { useSoundStore } from '@/stores/sound';
import { IS_NATIVE_APP } from '@/constants/app';
import { getAssetPath } from '@/helpers/path';

import type { FileSound, GeneratorSound, Sound } from '@/data/types';

interface PlaybackProps {
  functional: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  locked: boolean;
  sound: Sound;
  volume: number;
}

interface FilePlaybackProps
  extends Omit<PlaybackProps, 'functional' | 'sound'> {
  sound: FileSound;
}

interface AssetFilePlaybackProps extends Omit<FilePlaybackProps, 'sound'> {
  path: string;
}

function AssetFilePlayback({
  isPlaying,
  isSelected,
  locked,
  path,
  volume,
}: AssetFilePlaybackProps) {
  const sound = useSound(getAssetPath(path), { loop: true, volume });

  useEffect(() => {
    if (locked) return;

    if (isSelected && isPlaying) sound.play();
    else sound.pause();
  }, [isSelected, sound, isPlaying, locked]);

  return null;
}

function FilePlayback({ sound, ...state }: FilePlaybackProps) {
  if (sound.source.kind !== 'asset') return null;

  return <AssetFilePlayback path={sound.source.path} {...state} />;
}

interface GeneratorPlaybackProps
  extends Omit<PlaybackProps, 'functional' | 'sound'> {
  sound: GeneratorSound;
}

function GeneratorPlayback({
  isPlaying,
  isSelected,
  locked,
  sound: definition,
  volume,
}: GeneratorPlaybackProps) {
  const showSnackbar = useSnackbar();
  const unselect = useSoundStore(state => state.unselect);

  const handleError = useCallback(() => {
    unselect(definition.id);
    showSnackbar(`Could not start ${definition.label}.`);
  }, [definition.id, definition.label, showSnackbar, unselect]);

  const sound = useGeneratorAudio(definition.generator, volume, handleError);

  useEffect(() => {
    if (locked) return;

    if (!isSelected) sound.stop();
    else if (isPlaying) sound.play();
    else sound.pause();
  }, [isPlaying, isSelected, locked, sound]);

  return null;
}

export function Playback({ functional, sound, ...state }: PlaybackProps) {
  if (IS_NATIVE_APP || !functional) return null;
  if ('generator' in sound)
    return <GeneratorPlayback sound={sound} {...state} />;

  return <FilePlayback sound={sound} {...state} />;
}
