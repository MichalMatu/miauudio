import { defineBundledCategory } from './bundled';

export const nature = defineBundledCategory({
  icon: 'BiSolidTree',
  id: 'nature',
  sounds: [
    {
      icon: 'BiWater',
      id: 'river',
      label: 'River',
      path: '/sounds/nature/river.mp3',
    },
    {
      icon: 'FaWater',
      id: 'waves',
      label: 'Waves',
      path: '/sounds/nature/waves.mp3',
    },
    {
      icon: 'BsFire',
      id: 'campfire',
      label: 'Campfire',
      path: '/sounds/nature/campfire.mp3',
    },
    {
      icon: 'FaWind',
      id: 'wind',
      label: 'Wind',
      path: '/sounds/nature/wind.mp3',
    },
    {
      icon: 'FaWind',
      id: 'howling-wind',
      label: 'Howling Wind',
      path: '/sounds/nature/howling-wind.mp3',
    },
    {
      icon: 'BiSolidTree',
      id: 'wind-in-trees',
      label: 'Wind in Trees',
      path: '/sounds/nature/wind-in-trees.mp3',
    },
    {
      icon: 'GiWaterfall',
      id: 'waterfall',
      label: 'Waterfall',
      path: '/sounds/nature/waterfall.mp3',
    },
    {
      icon: 'FaRegSnowflake',
      id: 'walk-in-snow',
      label: 'Walk in Snow',
      path: '/sounds/nature/walk-in-snow.mp3',
    },
    {
      icon: 'FaLeaf',
      id: 'walk-on-leaves',
      label: 'Walk on Leaves',
      path: '/sounds/nature/walk-on-leaves.mp3',
    },
    {
      icon: 'GiStonePile',
      id: 'walk-on-gravel',
      label: 'Walk on Gravel',
      path: '/sounds/nature/walk-on-gravel.mp3',
    },
    {
      icon: 'BsFillDropletFill',
      id: 'droplets',
      label: 'Droplets',
      path: '/sounds/nature/droplets.mp3',
    },
    {
      icon: 'FaTree',
      id: 'jungle',
      label: 'Jungle',
      path: '/sounds/nature/jungle.mp3',
    },
  ],
  title: 'Nature',
});
