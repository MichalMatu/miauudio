import type { Category, FileSound } from '../types';

type BundledFileSoundInput = Omit<
  FileSound,
  'kind' | 'origin' | 'playback' | 'source'
> & {
  path: string;
};

interface BundledCategoryInput extends Omit<Category, 'sounds'> {
  sounds: Array<BundledFileSoundInput>;
}

export function defineBundledCategory({
  sounds,
  ...category
}: BundledCategoryInput): Category {
  return {
    ...category,
    sounds: sounds.map(({ path, ...sound }) => ({
      ...sound,
      kind: 'file',
      origin: 'bundled',
      playback: { kind: 'loop' },
      source: { kind: 'asset', path },
    })),
  };
}
