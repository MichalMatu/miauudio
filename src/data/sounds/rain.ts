import { defineBundledCategory } from './bundled';

export const rain = defineBundledCategory({
  icon: 'BsFillCloudRainFill',
  id: 'rain',
  sounds: [
    {
      icon: 'BsFillCloudRainFill',
      id: 'light-rain',
      label: 'Light Rain',
      path: '/sounds/rain/light-rain.mp3',
    },
    {
      icon: 'BsFillCloudRainHeavyFill',
      id: 'heavy-rain',
      label: 'Heavy Rain',
      path: '/sounds/rain/heavy-rain.mp3',
    },
    {
      icon: 'MdOutlineThunderstorm',
      id: 'thunder',
      label: 'Thunder',
      path: '/sounds/rain/thunder.mp3',
    },
    {
      icon: 'GiWindow',
      id: 'rain-on-window',
      label: 'Rain on Window',
      path: '/sounds/rain/rain-on-window.mp3',
    },
    {
      icon: 'FaCarSide',
      id: 'rain-on-car-roof',
      label: 'Rain on Car Roof',
      path: '/sounds/rain/rain-on-car-roof.mp3',
    },
    {
      icon: 'BsUmbrellaFill',
      id: 'rain-on-umbrella',
      label: 'Rain on Umbrella',
      path: '/sounds/rain/rain-on-umbrella.mp3',
    },
    {
      icon: 'PiTentFill',
      id: 'rain-on-tent',
      label: 'Rain on Tent',
      path: '/sounds/rain/rain-on-tent.mp3',
    },
    {
      icon: 'FaLeaf',
      id: 'rain-on-leaves',
      label: 'Rain on Leaves',
      path: '/sounds/rain/rain-on-leaves.mp3',
    },
  ],
  title: 'Rain',
});
