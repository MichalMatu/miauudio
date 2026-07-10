import type { SoundIconId } from './icon-ids';

export type GeneratorId = 'binaural' | 'isochronic';
export type SoundOrigin = 'bundled' | 'user';

export interface LoopPlayback {
  kind: 'loop';
}

interface SoundBase {
  icon: SoundIconId;
  id: string;
  label: string;
  origin: SoundOrigin;
  playback: LoopPlayback;
  shuffleable?: boolean;
}

export interface AssetSoundSource {
  kind: 'asset';
  path: string;
}

export interface AppFileSoundSource {
  fileId: string;
  kind: 'app-file';
}

export interface FileSound extends SoundBase {
  kind: 'file';
  source: AssetSoundSource | AppFileSoundSource;
}

export interface GeneratorSound extends SoundBase {
  generator: GeneratorId;
  kind: 'generator';
}

export type SoundDefinition = FileSound | GeneratorSound;
export type Sound = SoundDefinition;
export type Sounds = Array<SoundDefinition>;

export interface Category {
  icon: SoundIconId;
  id: string;
  sounds: Sounds;
  title: string;
}

export type Categories = Array<Category>;
