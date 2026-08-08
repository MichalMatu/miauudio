import { defineBundledCategory } from './bundled';

export const urban = defineBundledCategory({
  icon: 'FaCity',
  id: 'urban',
  sounds: [
    {
      icon: 'PiRoadHorizonFill',
      id: 'highway',
      label: 'Highway',
      path: '/sounds/urban/highway.mp3',
    },
    {
      icon: 'FaRoad',
      id: 'road',
      label: 'Road',
      path: '/sounds/urban/road.mp3',
    },
    {
      icon: 'PiSirenBold',
      id: 'ambulance-siren',
      label: 'Ambulance Siren',
      path: '/sounds/urban/ambulance-siren.mp3',
    },
    {
      icon: 'BsSoundwave',
      id: 'busy-street',
      label: 'Busy Street',
      path: '/sounds/urban/busy-street.mp3',
    },
    {
      icon: 'BsPeopleFill',
      id: 'crowd',
      label: 'Crowd',
      path: '/sounds/urban/crowd.mp3',
    },
    {
      icon: 'BiSolidTraffic',
      id: 'traffic',
      label: 'Traffic',
      path: '/sounds/urban/traffic.mp3',
    },
    {
      icon: 'RiSparkling2Fill',
      id: 'fireworks',
      label: 'Fireworks',
      path: '/sounds/urban/fireworks.mp3',
    },
  ],
  title: 'Urban',
});
