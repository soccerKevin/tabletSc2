import { useGameStore } from '@/stores/gameStore';
import type { Position } from '@/types/common';

export const initializeMap = (elementId: string): google.maps.Map => {
  const map = new google.maps.Map(document.getElementById(elementId)!, {
    zoom: 13,
    center: { lat: 37.7749, lng: -122.4194 },
    disableDefaultUI: true,
    zoomControl: true,
    draggable: false,
    gestureHandling: 'none'
  });

  useGameStore.getState().setMap(map);
  return map;
};

export const setupKeyboardEvents = (): void => {
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      useGameStore.getState().setSpacePressed(true);
      e.preventDefault();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      useGameStore.getState().setSpacePressed(false);
    }
  });

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
};

export const initGame = (): void => {
  const map = initializeMap('map');
  setupKeyboardEvents();
  
  const { createCar } = useGameStore.getState();
  createCar({ lat: 37.7749, lng: -122.4194 });
  createCar({ lat: 37.7849, lng: -122.4094 });
};