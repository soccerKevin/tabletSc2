import { useGameStore } from './store';

export const initGame = (): void => {
  const map = new google.maps.Map(document.getElementById('map')!, {
    zoom: 13,
    center: { lat: 37.7749, lng: -122.4194 },
    disableDefaultUI: true,
    zoomControl: true,
    draggable: false,
    gestureHandling: 'none'
  });

  const gameStore = useGameStore.getState();
  gameStore.setMap(map);
  
  // Create initial cars
  gameStore.createCar({ lat: 37.7749, lng: -122.4194 });
  gameStore.createCar({ lat: 37.7849, lng: -122.4094 });
};