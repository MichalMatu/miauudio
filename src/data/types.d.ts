export type GeneratorId = 'binaural' | 'isochronic';

interface SoundBase {
  icon: React.ReactNode;
  id: string;
  label: string;
  shuffleable?: boolean;
}

export interface FileSound extends SoundBase {
  src: string;
}

export interface GeneratorSound extends SoundBase {
  generator: GeneratorId;
}

export type Sound = FileSound | GeneratorSound;

export type Sounds = Array<Sound>;

export interface Category {
  icon: React.ReactNode;
  id: string;
  sounds: Sounds;
  title: string;
}

export type Categories = Array<Category>;
