import { FaHeadphonesAlt } from 'react-icons/fa';
import { TbWaveSine, TbWaveSquare } from 'react-icons/tb';

import type { Category } from '../types';

export const generators: Category = {
  icon: <TbWaveSquare />,
  id: 'generators',
  sounds: [
    {
      generator: 'binaural',
      icon: <FaHeadphonesAlt />,
      id: 'binaural',
      label: 'Binaural Beats',
      shuffleable: false,
    },
    {
      generator: 'isochronic',
      icon: <TbWaveSine />,
      id: 'isochronic',
      label: 'Isochronic Tones',
      shuffleable: false,
    },
  ],
  title: 'Generators',
};
