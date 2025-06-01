import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import type { Position } from '@/resources/map/types';
import type { Car } from '@/resources/car/types';

import { useCarStore } from '@/resources/car/store';

interface GameState {
  map: google.maps.Map | null;
  selectedCarIds: number[];
  isSpacePressed: boolean;
  destinationMarkers: google.maps.Marker[];
  movementLines: google.maps.Polyline[];
}

interface GameActions {
  setMap: (map: google.maps.Map) => void;
  createCar: (position: Position) => void;
  selectCar: (carId: number, clearOthers?: boolean) => void;
  moveCars: (carIds: number[], destination: Position, addToQueue?: boolean) => void;
  clearSelection: () => void;
  setSpacePressed: (pressed: boolean) => void;
  createDestinationMarker: (position: Position) => void;
  createMovementLine: (start: Position, end: Position) => void;
}

export const useGameStore = create<GameState & GameActions>()(
  subscribeWithSelector((set, get) => ({
    map: null,
    selectedCarIds: [],
    isSpacePressed: false,
    destinationMarkers: [],
    movementLines: [],

    setMap: (map) => {
      set({ map });
      
      // Setup map events directly here
      map.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
        e.stop();
        const { selectedCarIds } = get();
        if (selectedCarIds.length > 0) {
          const position = { lat: e.latLng!.lat(), lng: e.latLng!.lng() };
          const addToQueue = (e.domEvent as MouseEvent)?.shiftKey || false;
          get().moveCars(selectedCarIds, position, addToQueue);
        }
      });

      map.addListener('click', () => {
        get().clearSelection();
      });
    },

    createCar: (position) => {
      const { map } = get();
      if (!map) return;

      const carStore = useCarStore.getState();
      const car: Car = {
        id: carStore.carIdCounter,
        position,
        marker: null,
        isSelected: false,
        moveQueue: [],
        isMoving: false,
        element: null,
        speed: 200
      };

      const marker = new google.maps.Marker({
        position,
        map,
        icon: carStore.createCarIcon(false),
        draggable: false,
        title: `Car ${car.id}`
      });

      marker.addListener('click', (e: google.maps.MapMouseEvent) => {
        e.stop();
        get().selectCar(car.id, !(e.domEvent as MouseEvent)?.ctrlKey);
      });

      car.marker = marker;
      car.element = marker as any;
      carStore.addCar(car);
    },

    selectCar: (carId, clearOthers = true) => {
      const carStore = useCarStore.getState();
      const car = carStore.cars.find(c => c.id === carId);
      if (!car) return;

      carStore.selectCar(car, clearOthers);
      
      const selectedIds = carStore.selectedCars.map(c => c.id);
      set({ selectedCarIds: selectedIds });
      
      carStore.updateCarVisuals(carStore.cars, selectedIds);
    },

    moveCars: (carIds, destination, addToQueue = false) => {
      const { map } = get();
      const carStore = useCarStore.getState();
      if (!map) return;

      get().createDestinationMarker(destination);
      
      carIds.forEach(carId => {
        const car = carStore.cars.find(c => c.id === carId);
        if (car) {
          get().createMovementLine(car.position, destination);
          if (addToQueue) {
            carStore.addToMoveQueue(carId, destination);
            if (!car.isMoving) {
              carStore.startCarMovement(car);
            }
          } else {
            carStore.clearMoveQueue(carId);
            carStore.addToMoveQueue(carId, destination);
            carStore.startCarMovement(car);
          }
        }
      });
    },

    clearSelection: () => {
      const carStore = useCarStore.getState();
      carStore.clearSelection();
      carStore.updateCarVisuals(carStore.cars, []);
      set({ selectedCarIds: [] });
    },

    setSpacePressed: (pressed) => {
      const { map } = get();
      if (map) {
        map.setOptions({ 
          draggable: pressed, 
          gestureHandling: pressed ? 'cooperative' : 'none' 
        });
      }
      set({ isSpacePressed: pressed });
    },

    createDestinationMarker: (position) => {
      const { map, destinationMarkers } = get();
      if (!map) return;

      const marker = new google.maps.Marker({
        position,
        map,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
              <circle cx="10" cy="10" r="3" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(20, 20),
          anchor: new google.maps.Point(10, 10)
        }
      });

      set(state => ({ destinationMarkers: [...state.destinationMarkers, marker] }));
      
      setTimeout(() => {
        marker.setMap(null);
        set(state => ({
          destinationMarkers: state.destinationMarkers.filter(m => m !== marker)
        }));
      }, 5000);
    },

    createMovementLine: (start, end) => {
      const { map } = get();
      if (!map) return;

      const line = new google.maps.Polyline({
        path: [start, end],
        geodesic: true,
        strokeColor: '#00ff00',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map
      });

      set(state => ({ movementLines: [...state.movementLines, line] }));
      
      setTimeout(() => {
        line.setMap(null);
        set(state => ({
          movementLines: state.movementLines.filter(l => l !== line)
        }));
      }, 3000);
    }
  }))
);