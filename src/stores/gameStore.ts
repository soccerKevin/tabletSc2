import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Position } from '@/types/common';
import type { Car } from '@/resources/car/types';

interface GameState {
  map: google.maps.Map | null;
  cars: Car[];
  selectedCarIds: number[];
  isSpacePressed: boolean;
  carIdCounter: number;
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
  updateCarPosition: (carId: number, position: Position) => void;
  setCarMoving: (carId: number, isMoving: boolean) => void;
  addToMoveQueue: (carId: number, position: Position) => void;
  clearMoveQueue: (carId: number) => void;
  getNextQueuePosition: (carId: number) => Position | null;
}

export const useGameStore = create<GameState & GameActions>()(
  subscribeWithSelector((set, get) => ({
    map: null,
    cars: [],
    selectedCarIds: [],
    isSpacePressed: false,
    carIdCounter: 0,
    destinationMarkers: [],
    movementLines: [],

    setMap: (map) => {
      set({ map });
      setupMapEvents(map);
    },

    createCar: (position) => {
      const { map, carIdCounter } = get();
      if (!map) return;

      const car = createCarEntity(carIdCounter, position, map);
      set(state => ({
        cars: [...state.cars, car],
        carIdCounter: carIdCounter + 1
      }));
    },

    selectCar: (carId, clearOthers = true) => set(state => {
      const newSelection = clearOthers ? [carId] : 
        state.selectedCarIds.includes(carId) 
          ? state.selectedCarIds.filter(id => id !== carId)
          : [...state.selectedCarIds, carId];
      
      updateCarVisuals(state.cars, newSelection);
      return { selectedCarIds: newSelection };
    }),

    moveCars: (carIds, destination, addToQueue = false) => {
      const { cars, map, destinationMarkers, movementLines } = get();
      if (!map) return;

      createDestinationMarker(destination, map, destinationMarkers);
      
      carIds.forEach(carId => {
        const car = cars.find(c => c.id === carId);
        if (car) {
          createMovementLine(car.position, destination, map, movementLines);
          if (addToQueue) {
            get().addToMoveQueue(carId, destination);
            if (!car.isMoving) {
              startCarMovement(car);
            }
          } else {
            get().clearMoveQueue(carId);
            get().addToMoveQueue(carId, destination);
            startCarMovement(car);
          }
        }
      });
    },

    clearSelection: () => {
      const { cars } = get();
      updateCarVisuals(cars, []);
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

    updateCarPosition: (carId, position) => set(state => ({
      cars: state.cars.map(car => 
        car.id === carId ? { ...car, position } : car
      )
    })),

    setCarMoving: (carId, isMoving) => set(state => ({
      cars: state.cars.map(car => 
        car.id === carId ? { ...car, isMoving } : car
      )
    })),

    addToMoveQueue: (carId, position) => set(state => ({
      cars: state.cars.map(car => 
        car.id === carId 
          ? { ...car, moveQueue: [...car.moveQueue, position] }
          : car
      )
    })),

    clearMoveQueue: (carId) => set(state => ({
      cars: state.cars.map(car => 
        car.id === carId ? { ...car, moveQueue: [] } : car
      )
    })),

    getNextQueuePosition: (carId) => {
      const car = get().cars.find(c => c.id === carId);
      if (!car || car.moveQueue.length === 0) return null;
      
      const nextPosition = car.moveQueue[0];
      set(state => ({
        cars: state.cars.map(c => 
          c.id === carId 
            ? { ...c, moveQueue: c.moveQueue.slice(1) }
            : c
        )
      }));
      
      return nextPosition;
    }
  }))
);

const createCarEntity = (id: number, position: Position, map: google.maps.Map): Car => {
  const marker = new google.maps.Marker({
    position,
    map,
    icon: createCarIcon(false),
    draggable: false,
    title: `Car ${id}`
  });

  marker.addListener('click', (e: google.maps.MapMouseEvent) => {
    e.stop();
    useGameStore.getState().selectCar(id, !e.domEvent?.ctrlKey);
  });

  return {
    id,
    position,
    marker,
    isSelected: false,
    moveQueue: [],
    isMoving: false,
    element: marker as any,
    speed: 200
  };
};

const createCarIcon = (isSelected: boolean): google.maps.Icon => {
  const size = isSelected ? 45 : 30;
  const color = isSelected ? '#00ff00' : '#4285f4';
  const strokeWidth = isSelected ? 4 : 2;
  const glowEffect = isSelected ? `<circle cx="${(size + 6)/2}" cy="${(size + 6)/2}" r="${size/2 + 3}" fill="none" stroke="#00ff00" stroke-width="2" opacity="0.6"/>` : '';
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="${size + 6}" height="${size + 6}" viewBox="0 0 ${size + 6} ${size + 6}" xmlns="http://www.w3.org/2000/svg">
        ${glowEffect}
        <circle cx="${(size + 6)/2}" cy="${(size + 6)/2}" r="${size/2 - strokeWidth}" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}"/>
        <text x="${(size + 6)/2}" y="${(size + 6)/2 + 6}" text-anchor="middle" fill="white" font-size="${Math.floor(size * 0.5)}" font-weight="bold">🚗</text>
      </svg>
    `),
    scaledSize: new google.maps.Size(size + 6, size + 6),
    anchor: new google.maps.Point((size + 6)/2, (size + 6)/2)
  };
};

const updateCarVisuals = (cars: Car[], selectedIds: number[]) => {
  cars.forEach(car => {
    const isSelected = selectedIds.includes(car.id);
    car.isSelected = isSelected;
    if (car.marker) {
      car.marker.setIcon(createCarIcon(isSelected));
    }
  });
};

const setupMapEvents = (map: google.maps.Map) => {
  map.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
    e.stop();
    const { selectedCarIds } = useGameStore.getState();
    if (selectedCarIds.length > 0) {
      const position = { lat: e.latLng!.lat(), lng: e.latLng!.lng() };
      const addToQueue = e.domEvent?.shiftKey || false;
      useGameStore.getState().moveCars(selectedCarIds, position, addToQueue);
    }
  });

  map.addListener('click', () => {
    useGameStore.getState().clearSelection();
  });
};

const createDestinationMarker = (position: Position, map: google.maps.Map, markers: google.maps.Marker[]) => {
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

  markers.push(marker);
  
  setTimeout(() => {
    marker.setMap(null);
    const index = markers.indexOf(marker);
    if (index > -1) {
      markers.splice(index, 1);
    }
  }, 5000);
};

const createMovementLine = (start: Position, end: Position, map: google.maps.Map, lines: google.maps.Polyline[]) => {
  const line = new google.maps.Polyline({
    path: [start, end],
    geodesic: true,
    strokeColor: '#00ff00',
    strokeOpacity: 0.8,
    strokeWeight: 3,
    map
  });

  lines.push(line);
  
  setTimeout(() => {
    line.setMap(null);
    const index = lines.indexOf(line);
    if (index > -1) {
      lines.splice(index, 1);
    }
  }, 3000);
};

const startCarMovement = (car: Car) => {
  const store = useGameStore.getState();
  const nextPosition = store.getNextQueuePosition(car.id);
  
  if (!nextPosition) {
    store.setCarMoving(car.id, false);
    return;
  }
  
  store.setCarMoving(car.id, true);
  animateCarMovement(car, nextPosition);
};

const animateCarMovement = (car: Car, destination: Position) => {
  const start = car.position;
  const distance = calculateDistance(start, destination);
  const duration = Math.max((distance / 200) * 3600000, 500);
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const lat = start.lat + (destination.lat - start.lat) * progress;
    const lng = start.lng + (destination.lng - start.lng) * progress;
    
    const newPosition = { lat, lng };
    
    useGameStore.getState().updateCarPosition(car.id, newPosition);
    
    if (car.marker) {
      car.marker.setPosition(newPosition);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      startCarMovement(car);
    }
  };
  
  animate();
};

const calculateDistance = (pos1: Position, pos2: Position): number => {
  const R = 6371;
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};