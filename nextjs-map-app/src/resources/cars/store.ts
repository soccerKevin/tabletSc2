import { create } from 'zustand';
import type { Car } from './types';
import type { Checkpoint } from '@/resources/checkpoints/types'; // New import

// CarStoreState interface definition
export interface CarStoreState {
  cars: Car[];
  addCar: (car: Car) => void;
  updateCar: (id: string, updatedData: Partial<Omit<Car, 'id' | 'checkpoints'>>) => void; // Omit checkpoints from direct update
  removeCar: (id: string) => void;
  setCars: (cars: Car[]) => void;
  selectedCarIds: string[];
  setSelectedCarIds: (selectedCarIds: string[]) => void;
  toggleCarSelection: (carId: string) => void;
  selectSingleCar: (carId: string) => void;
  deselectAllCars: () => void;
  
  // Checkpoint management actions
  setCheckpoints: (carId: string, checkpoints: Checkpoint[]) => void;
  appendCheckpoint: (carId: string, checkpoint: Checkpoint) => void;
  clearCheckpoints: (carId: string) => void;
  
  // Movement related actions
  startMovement: (carId: string) => void;
  stopMovement: (carId: string) => void;
  updateCarLocation: (carId: string, location: { lat: number; lng: number }) => void;
  advanceToCheckpoint: (carId: string) => void;
  updateCarOrientation: (carId: string, orientation: number) => void; // New action
}

// useCarStore implementation
export const useCarStore = create<CarStoreState>((set, get) => ({
  cars: [],
  addCar: (car) =>
    set((state) => {
      if (state.cars.find((c) => c.id === car.id)) {
        console.warn(`Car with ID ${car.id} already exists. Not adding.`);
        return state;
      }
      // Ensure checkpoints array and movement states are initialized
      return { 
        cars: [
          ...state.cars, 
          { 
            ...car, 
            checkpoints: car.checkpoints || [], 
            isMoving: car.isMoving || false, 
            currentCheckpointIndex: car.currentCheckpointIndex || 0 
          }
        ] 
      };
    }),
  updateCar: (id, updatedData) => // Checkpoints and movement state should be managed via specific actions
    set((state) => ({
      cars: state.cars.map((car) =>
        car.id === id ? { ...car, ...updatedData } : car
      ),
    })),
  removeCar: (id) =>
    set((state) => ({ cars: state.cars.filter((car) => car.id !== id) })),
  setCars: (newCars) => 
    set({ 
      cars: newCars.map(car => ({ 
        ...car, 
        checkpoints: car.checkpoints || [], 
        isMoving: car.isMoving || false, 
        currentCheckpointIndex: car.currentCheckpointIndex || 0 
      })) 
    }),
  selectedCarIds: [],
  setSelectedCarIds: (selectedCarIds) => set({ selectedCarIds }),
  toggleCarSelection: (carId) =>
    set((state) => {
      const newSelectedCarIds = state.selectedCarIds.includes(carId)
        ? state.selectedCarIds.filter((id) => id !== carId)
        : [...state.selectedCarIds, carId];
      return { selectedCarIds: newSelectedCarIds };
    }),
  selectSingleCar: (carId) => set({ selectedCarIds: [carId] }),
  deselectAllCars: () => set({ selectedCarIds: [] }),

  // Checkpoint management implementations (verified to reset movement state)
  setCheckpoints: (carId, checkpoints) =>
    set((state) => ({
      cars: state.cars.map((car) =>
        car.id === carId 
          ? { ...car, checkpoints, isMoving: false, currentCheckpointIndex: 0 } 
          : car
      ),
    })),
  appendCheckpoint: (carId, checkpoint) => // Appending doesn't reset movement state by default
    set((state) => ({
      cars: state.cars.map((car) =>
        car.id === carId
          ? { ...car, checkpoints: [...car.checkpoints, checkpoint] }
          : car
      ),
    })),
  clearCheckpoints: (carId) =>
    set((state) => ({
      cars: state.cars.map((car) =>
        car.id === carId 
          ? { ...car, checkpoints: [], isMoving: false, currentCheckpointIndex: 0 } 
          : car
      ),
    })),

  // Movement related actions implementations
  startMovement: (carId) =>
    set((state) => {
      const car = state.cars.find(c => c.id === carId);
      if (car && car.checkpoints.length > 0 && (car.currentCheckpointIndex ?? 0) < car.checkpoints.length) {
        return {
          cars: state.cars.map((c) =>
            c.id === carId ? { ...c, isMoving: true } : c
          ),
        };
      }
      return state; // No change if conditions not met
    }),
  stopMovement: (carId) =>
    set((state) => ({
      cars: state.cars.map((c) =>
        c.id === carId ? { ...c, isMoving: false } : c
      ),
    })),
  updateCarLocation: (carId, location) =>
    set((state) => ({
      cars: state.cars.map((c) =>
        c.id === carId ? { ...c, location } : c
      ),
    })),
  advanceToCheckpoint: (carId) =>
    set((state) => {
      const car = state.cars.find(c => c.id === carId);
      if (!car) return state;

      const newIndex = (car.currentCheckpointIndex ?? 0) + 1;
      if (newIndex >= car.checkpoints.length) {
        // Reached end of checkpoints
        return {
          cars: state.cars.map((c) =>
            c.id === carId ? { ...c, isMoving: false, currentCheckpointIndex: newIndex } : c
          ),
        };
      } else {
        // Advance to next checkpoint
        return {
          cars: state.cars.map((c) =>
            c.id === carId ? { ...c, currentCheckpointIndex: newIndex } : c
          ),
        };
      }
    }),
  updateCarOrientation: (carId, orientation) => // New action implementation
    set((state) => ({
      cars: state.cars.map((c) =>
        c.id === carId ? { ...c, orientation } : c
      ),
    })),
}));
