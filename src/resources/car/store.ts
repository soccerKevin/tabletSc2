// File: src/resources/car/store.ts
import { create } from 'zustand';
import type { Car, CarState } from './types';
import type { Position } from '@/types/common';

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
}

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
      // Clear all other selections - but don't try to manipulate DOM here
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
    
    // Don't try to manipulate DOM elements here since we're using Google Maps markers
    
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
  }
}));