import { defineBundledCategory } from './bundled';

export const noise = defineBundledCategory({
  icon: 'BsSoundwave',
  id: 'noise',
  sounds: [
    {
      icon: 'GiSoundWaves',
      id: 'white-noise',
      label: 'White Noise',
      path: '/sounds/noise/white-noise.wav',
    },
    {
      icon: 'GiSoundWaves',
      id: 'pink-noise',
      label: 'Pink Noise',
      path: '/sounds/noise/pink-noise.wav',
    },
    {
      icon: 'GiSoundWaves',
      id: 'brown-noise',
      label: 'Brown Noise',
      path: '/sounds/noise/brown-noise.wav',
    },
  ],
  title: 'Noise',
});
