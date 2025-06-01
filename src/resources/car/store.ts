// File: src/resources/car/store.ts
import { create } from 'zustand';

import type { Position } from '@/types/common';

import type { Car, CarState } from './types';

interface CarStore extends CarState {
  addCar: (car: Car) => void;
  removeCar: (carId: number) => void;
  selectCar: (car: Car, clearOthers?: boolean) => void;
  clearSelection: () => void;
  updateCarPosition: (carId: number, position: Position) => void;
  setCarMoving: (carId: number, isMoving: boolean) => void;
  addToMoveQueue: (carId: number, position: Position) => void;
  clearMoveQueue: (carId: number) => void;
  getNextQueuePosition: (carId: number) => Position | null;
  startCarMovement: (car: Car) => void;
  createCarIcon: (isSelected: boolean) => google.maps.Icon;
  updateCarVisuals: (cars: Car[], selectedIds: number[]) => void;
}

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

export const useCarStore = create<CarStore>((set, get) => ({
  cars: [],
  selectedCars: [],
  carIdCounter: 0,

  addCar: (car) => set((state) => ({
    cars: [...state.cars, car],
    carIdCounter: Math.max(state.carIdCounter, car.id + 1)
  })),

  removeCar: (carId) => set((state) => ({
    cars: state.cars.filter(car => car.id !== carId),
    selectedCars: state.selectedCars.filter(car => car.id !== carId)
  })),

  selectCar: (car, clearOthers = true) => set((state) => {
    let newSelectedCars = clearOthers ? [] : [...state.selectedCars];
    
    const carIndex = state.cars.findIndex(c => c.id === car.id);
    if (carIndex === -1) return state;
    
    const updatedCar = { ...car, isSelected: !car.isSelected };
    const updatedCars = [...state.cars];
    updatedCars[carIndex] = updatedCar;
    
    if (clearOthers) {
      updatedCars.forEach(c => {
        if (c.id !== car.id) {
          c.isSelected = false;
        }
      });
    }
    
    if (updatedCar.isSelected) {
      if (!newSelectedCars.find(c => c.id === car.id)) {
        newSelectedCars.push(updatedCar);
      }
    } else {
      newSelectedCars = newSelectedCars.filter(c => c.id !== car.id);
    }
    
    return {
      cars: updatedCars,
      selectedCars: newSelectedCars
    };
  }),

  clearSelection: () => set((state) => {
    const updatedCars = state.cars.map(car => ({
      ...car,
      isSelected: false
    }));
    
    return {
      cars: updatedCars,
      selectedCars: []
    };
  }),

  updateCarPosition: (carId, position) => set((state) => ({
    cars: state.cars.map(car => 
      car.id === carId ? { ...car, position } : car
    )
  })),

  setCarMoving: (carId, isMoving) => set((state) => ({
    cars: state.cars.map(car => 
      car.id === carId ? { ...car, isMoving } : car
    )
  })),

  addToMoveQueue: (carId, position) => set((state) => ({
    cars: state.cars.map(car => 
      car.id === carId 
        ? { ...car, moveQueue: [...car.moveQueue, position] }
        : car
    )
  })),

  clearMoveQueue: (carId) => set((state) => ({
    cars: state.cars.map(car => 
      car.id === carId ? { ...car, moveQueue: [] } : car
    )
  })),

  getNextQueuePosition: (carId) => {
    const car = get().cars.find(c => c.id === carId);
    if (!car || car.moveQueue.length === 0) return null;
    
    const nextPosition = car.moveQueue[0];
    set((state) => ({
      cars: state.cars.map(c => 
        c.id === carId 
          ? { ...c, moveQueue: c.moveQueue.slice(1) }
          : c
      )
    }));
    
    return nextPosition;
  },

  startCarMovement: (car: Car) => {
    const store = get();
    const nextPosition = store.getNextQueuePosition(car.id);
    
    if (!nextPosition) {
      store.setCarMoving(car.id, false);
      return;
    }
    
    store.setCarMoving(car.id, true);
    
    const start = car.position;
    const distance = calculateDistance(start, nextPosition);
    const duration = Math.max((distance / 200) * 3600000, 500);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const lat = start.lat + (nextPosition.lat - start.lat) * progress;
      const lng = start.lng + (nextPosition.lng - start.lng) * progress;
      
      const newPosition = { lat, lng };
      
      get().updateCarPosition(car.id, newPosition);
      
      if (car.marker) {
        car.marker.setPosition(newPosition);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        get().startCarMovement(car);
      }
    };
    
    animate();
  },

  createCarIcon: (isSelected: boolean) => {
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
  },

  updateCarVisuals: (cars: Car[], selectedIds: number[]) => {
    const { createCarIcon } = get();
    cars.forEach(car => {
      const isSelected = selectedIds.includes(car.id);
      car.isSelected = isSelected;
      if (car.marker) {
        car.marker.setIcon(createCarIcon(isSelected));
      }
    });
  }
}));