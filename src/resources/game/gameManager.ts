import { MapManager } from "@/resources/map/mapManager";
import { CarManager } from "@/resources/car/carManager";
import { useGameStore } from "./store";

let mapManager: MapManager;
let carManager: CarManager;

export const initGame = (): void => {
  // Initialize managers
  mapManager = new MapManager();
  carManager = new CarManager();

  // Initialize map with proper config
  const map = mapManager.initMap("map", {
    zoom: 13,
    center: { lat: 37.7749, lng: -122.4194 },
    disableDefaultUI: true,
    zoomControl: true,
  });

  const gameStore = useGameStore.getState();
  gameStore.setMap(map);

  // Set up event handlers for right-click movement and shift+right-click queueing
  mapManager.setEventHandlers({
    onRightClick: (position, event) => {
      const domEvent = event.domEvent as MouseEvent;
      const addToQueue = domEvent?.shiftKey || false;

      // Move selected cars to the clicked position
      const selectedCars = carManager.getSelectedCars();
      if (selectedCars.length > 0) {
        carManager.moveSelectedCars(position, { addToQueue });
      }
    },
  });

  // Create initial cars using CarManager
  const car1 = carManager.createCar({ lat: 37.7749, lng: -122.4194 });
  const car2 = carManager.createCar({ lat: 37.7849, lng: -122.4094 });

  // Store references for access from other parts of the app
  (window as any).__mapManager = mapManager;
  (window as any).__carManager = carManager;
};

export const getManagers = () => ({
  mapManager,
  carManager,
});
