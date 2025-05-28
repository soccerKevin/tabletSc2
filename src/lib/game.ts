import { MapManager } from '@/resources/map/mapManager';
import { CarManager } from '@/resources/car/carManager';
import type { Position } from '@/types/common';

export class Game {
  private mapManager: MapManager;
  private carManager: CarManager;

  constructor() {
    this.mapManager = new MapManager();
    this.carManager = new CarManager();
    this.setupEventHandlers();
  }

  initGame(): void {
    const map = this.mapManager.initMap('map');
    this.carManager.createCar({ lat: 37.7749, lng: -122.4194 });
    this.carManager.createCar({ lat: 37.7849, lng: -122.4094 });
  }

  private setupEventHandlers(): void {
    this.mapManager.setEventHandlers({
      onRightClick: (position: Position, event: google.maps.MapMouseEvent) => {
        const selectedCars = this.carManager.getSelectedCars();
        
        if (selectedCars.length > 0) {
          const isShiftPressed = event.domEvent?.shiftKey || false;
          this.carManager.moveSelectedCars(position, {
            addToQueue: isShiftPressed
          });
        }
      },
      
      onClick: () => {
        this.carManager.clearSelection();
      }
    });
  }
}