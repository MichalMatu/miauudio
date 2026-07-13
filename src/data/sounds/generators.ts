import type { Category } from '../types';

export const generators: Category = {
  icon: 'TbWaveSquare',
  id: 'generators',
  sounds: [
    {
      generator: 'binaural',
      icon: 'FaHeadphonesAlt',
      id: 'binaural',
      kind: 'generator',
      label: 'Binaural Beats',
      origin: 'bundled',
      playback: { kind: 'loop' },
      shuffleable: false,
    },
    {
      generator: 'isochronic',
      icon: 'TbWaveSine',
      id: 'isochronic',
      kind: 'generator',
      label: 'Isochronic Tones',
      origin: 'bundled',
      playback: { kind: 'loop' },
      shuffleable: false,
    },
    {
      generator: 'phase',
      icon: 'TbArrowsLeftRight',
      id: 'phase',
      kind: 'generator',
      label: 'Phase Shift',
      origin: 'bundled',
      playback: { kind: 'loop' },
      shuffleable: false,
    },
  ],
  title: 'Generators',
};
