import { create } from 'zustand';

export interface Car {
  id: string;
  name: string;
  payload: string;
  location: { lat: number; lng: number };
  speed: number;
  orientation: number; // degrees from North
  connectivity: 'online' | 'offline' | 'poor';
}

export interface CarStoreState {
  cars: Car[];
  addCar: (car: Car) => void;
  updateCar: (id: string, updatedData: Partial<Omit<Car, 'id'>>) => void;
  removeCar: (id: string) => void;
  setCars: (cars: Car[]) => void; // For initializing/resetting cars

  // New selection properties
  selectedCarIds: string[];
  setSelectedCarIds: (selectedCarIds: string[]) => void;
  toggleCarSelection: (carId: string) => void;
  selectSingleCar: (carId: string) => void;
  deselectAllCars: () => void;
}

export const useCarStore = create<CarStoreState>((set) => ({
  cars: [],
  addCar: (car) =>
    set((state) => {
      if (state.cars.find((c) => c.id === car.id)) {
        // Optionally, you could throw an error or log a warning here
        console.warn(`Car with ID ${car.id} already exists. Not adding.`);
        return state; // Return current state if car with ID already exists
      }
      return { cars: [...state.cars, car] };
    }),
  updateCar: (id, updatedData) =>
    set((state) => ({
      cars: state.cars.map((car) =>
        car.id === id ? { ...car, ...updatedData } : car
      ),
    })),
  removeCar: (id) =>
    set((state) => ({ cars: state.cars.filter((car) => car.id !== id) })),
  setCars: (cars) => set({ cars }),

  // New selection state and actions
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
}));
