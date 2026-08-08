import { defineBundledCategory } from './bundled';

export const places = defineBundledCategory({
  icon: 'MdLocationPin',
  id: 'places',
  sounds: [
    {
      icon: 'BiSolidCoffeeAlt',
      id: 'cafe',
      label: 'Cafe',
      path: '/sounds/places/cafe.mp3',
    },
    {
      icon: 'BiSolidPlaneAlt',
      id: 'airport',
      label: 'Airport',
      path: '/sounds/places/airport.mp3',
    },
    {
      icon: 'FaChurch',
      id: 'church',
      label: 'Church',
      path: '/sounds/places/church.mp3',
    },
    {
      icon: 'MdTempleBuddhist',
      id: 'temple',
      label: 'Temple',
      path: '/sounds/places/temple.mp3',
    },
    {
      icon: 'MdConstruction',
      id: 'construction-site',
      label: 'Construction Site',
      path: '/sounds/places/construction-site.mp3',
    },
    {
      icon: 'TbScubaMask',
      id: 'underwater',
      label: 'Underwater',
      path: '/sounds/places/underwater.mp3',
    },
    {
      icon: 'TbBeerFilled',
      id: 'crowded-bar',
      label: 'Crowded Bar',
      path: '/sounds/places/crowded-bar.mp3',
    },
    {
      icon: 'GiVillage',
      id: 'night-village',
      label: 'Night Village',
      path: '/sounds/places/night-village.mp3',
    },
    {
      icon: 'FaSubway',
      id: 'subway-station',
      label: 'Subway Station',
      path: '/sounds/places/subway-station.mp3',
    },
    {
      icon: 'HiOfficeBuilding',
      id: 'office',
      label: 'Office',
      path: '/sounds/places/office.mp3',
    },
    {
      icon: 'FaShoppingBasket',
      id: 'supermarket',
      label: 'Supermarket',
      path: '/sounds/places/supermarket.mp3',
    },
    {
      icon: 'GiCarousel',
      id: 'carousel',
      label: 'Carousel',
      path: '/sounds/places/carousel.mp3',
    },
    {
      icon: 'AiFillExperiment',
      id: 'laboratory',
      label: 'Laboratory',
      path: '/sounds/places/laboratory.mp3',
    },
    {
      icon: 'BiSolidDryer',
      id: 'laundry-room',
      label: 'Laundry Room',
      path: '/sounds/places/laundry-room.mp3',
    },
    {
      icon: 'IoRestaurant',
      id: 'restaurant',
      label: 'Restaurant',
      path: '/sounds/places/restaurant.mp3',
    },
    {
      icon: 'FaBookOpen',
      id: 'library',
      label: 'Library',
      path: '/sounds/places/library.mp3',
    },
  ],
  title: 'Places',
});
