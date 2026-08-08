import { defineBundledCategory } from './bundled';

export const transport = defineBundledCategory({
  icon: 'FaCarSide',
  id: 'transport',
  sounds: [
    {
      icon: 'BiSolidTrain',
      id: 'train',
      label: 'Train',
      path: '/sounds/transport/train.mp3',
    },
    {
      icon: 'BiSolidTrain',
      id: 'inside-a-train',
      label: 'Inside a Train',
      path: '/sounds/transport/inside-a-train.mp3',
    },
    {
      icon: 'BiSolidPlaneAlt',
      id: 'airplane',
      label: 'Airplane',
      path: '/sounds/transport/airplane.mp3',
    },
    {
      icon: 'GiSubmarine',
      id: 'submarine',
      label: 'Submarine',
      path: '/sounds/transport/submarine.mp3',
    },
    {
      icon: 'GiSailboat',
      id: 'sailboat',
      label: 'Sailboat',
      path: '/sounds/transport/sailboat.mp3',
    },
    {
      icon: 'TbSailboat',
      id: 'rowing-boat',
      label: 'Rowing Boat',
      path: '/sounds/transport/rowing-boat.mp3',
    },
  ],
  title: 'Transport',
});
