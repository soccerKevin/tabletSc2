import type { Position } from "@/resources/map/types";

import type { Car, MovementOptions } from "./types";
import { useCarStore } from "./store";
import { useMapStore } from "@/resources/map/store";
import { DEFAULT_CAR_CONFIG, CAR_CONSTANTS } from "./defaults";

export class CarManager {
  private destinationMarkers: google.maps.Marker[] = [];
  private movementLines: google.maps.Polyline[] = [];
  private checkpointMarkers: Map<number, google.maps.Marker[]> = new Map();
  private checkpointLines: Map<number, google.maps.Polyline[]> = new Map();

  constructor() {
    this.initEventListeners();
  }

  createCar(position: Position, speed: number = DEFAULT_CAR_CONFIG.speed): Car {
    const store = useCarStore.getState();
    const mapStore = useMapStore.getState();

    if (!mapStore.map) {
      throw new Error("Map not initialized");
    }

    const car: Car = {
      id: store.carIdCounter,
      position,
      marker: null,
      isSelected: false,
      moveQueue: [],
      isMoving: false,
      element: null,
      speed,
    };

    car.marker = new google.maps.Marker({
      position,
      map: mapStore.map,
      title: `Car ${car.id}`,
      icon: this.createCarIcon(false),
      draggable: false,
    });

    this.setupCarEvents(car);

    car.element = car.marker as any;
    store.addCar(car);
    return car;
  }

  private setupCarEvents(car: Car): void {
    if (!car.marker) return;

    car.marker.addListener("click", (e: google.maps.MapMouseEvent) => {
      e.stop();
      const mouseEvent = e.domEvent as MouseEvent;
      this.selectCar(car, !mouseEvent?.ctrlKey && !mouseEvent?.metaKey);
    });
  }

  private createCarIcon = (
    isSelected: boolean,
    rotation: number = 0,
  ): google.maps.Icon => {
    const baseSize = 30;
    const selectedSize = 45;
    const size = isSelected ? selectedSize : baseSize;

    // Always use the actual car image, but adjust size based on selection
    return {
      url: "/images/car.png",
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
      ...(rotation !== 0 && { rotation }),
    } as google.maps.Icon;
  };

  selectCar(car: Car, clearOthers: boolean = true): void {
    const store = useCarStore.getState();
    store.selectCar(car, clearOthers);

    const updatedCars = store.cars;
    updatedCars.forEach((c) => {
      if (c.marker) {
        this.updateCarRotation(c);
      }
    });

    // Update checkpoint visibility when selection changes
    this.updateCheckpointVisibility();
  }

  moveSelectedCars(destination: Position, options: MovementOptions = {}): void {
    const { selectedCars } = useCarStore.getState();
    const { map } = useMapStore.getState();

    if (!map || selectedCars.length === 0) return;

    // Always clear old movement lines when new movement is initiated
    this.movementLines.forEach((line) => line.setMap(null));
    this.movementLines = [];

    // Clear old destination markers if not adding to queue
    if (!options.addToQueue) {
      this.destinationMarkers.forEach((marker) => marker.setMap(null));
      this.destinationMarkers = [];
    }

    this.createDestinationMarker(destination, map);

    selectedCars.forEach((car) => {
      this.createMovementLine(car.position, destination, map);
      this.moveCar(car, destination, options);
    });
  }

  private createDestinationMarker(
    position: Position,
    map: google.maps.Map,
  ): void {
    const marker = new google.maps.Marker({
      position,
      map,
      icon: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
            <circle cx="10" cy="10" r="3" fill="#ffffff"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(20, 20),
        anchor: new google.maps.Point(10, 10),
      },
    });

    this.destinationMarkers.push(marker);

    setTimeout(() => {
      marker.setMap(null);
      const index = this.destinationMarkers.indexOf(marker);
      if (index > -1) {
        this.destinationMarkers.splice(index, 1);
      }
    }, 5000);
  }

  private createMovementLine(
    start: Position,
    end: Position,
    map: google.maps.Map,
  ): void {
    const line = new google.maps.Polyline({
      path: [start, end],
      geodesic: true,
      strokeColor: "#00ff00",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map,
    });

    this.movementLines.push(line);

    // Remove green movement lines much faster - they're just for initial feedback
    setTimeout(() => {
      line.setMap(null);
      const index = this.movementLines.indexOf(line);
      if (index > -1) {
        this.movementLines.splice(index, 1);
      }
    }, 1000); // Reduced from 3000ms to 1000ms
  }

  moveCar(
    car: Car,
    destination: Position,
    options: MovementOptions = {},
  ): void {
    const store = useCarStore.getState();

    if (options.addToQueue) {
      store.addToMoveQueue(car.id, destination);
      if (!car.isMoving) {
        this.startCarMovement(car);
      }
    } else {
      store.clearMoveQueue(car.id);
      store.addToMoveQueue(car.id, destination);
      this.startCarMovement(car);
    }

    // Update checkpoint visualization for this car
    this.updateCarCheckpoints(car);
  }

  private startCarMovement(car: Car): void {
    const store = useCarStore.getState();
    const nextPosition = store.getNextQueuePosition(car.id);

    if (!nextPosition) {
      store.setCarMoving(car.id, false);
      // Update checkpoints when car finishes moving
      this.updateCarCheckpoints(car);
      return;
    }

    // Clear any remaining green movement lines when car actually starts moving
    this.movementLines.forEach((line) => line.setMap(null));
    this.movementLines = [];

    store.setCarMoving(car.id, true);
    this.animateCarMovement(car, nextPosition);
  }

  private animateCarMovement(car: Car, destination: Position): void {
    const start = car.position;
    const distance = this.calculateDistance(start, destination);
    const duration = Math.max((distance / car.speed) * 3600000, 500);
    const startTime = Date.now();

    // Set initial rotation towards destination
    const rotation = this.calculateBearing(start, destination);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const lat = start.lat + (destination.lat - start.lat) * progress;
      const lng = start.lng + (destination.lng - start.lng) * progress;

      const newPosition = { lat, lng };

      useCarStore.getState().updateCarPosition(car.id, newPosition);

      if (car.marker) {
        car.marker.setPosition(newPosition);
        // Update rotation to point towards destination during movement
        car.marker.setIcon(this.createCarIcon(car.isSelected, rotation));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Car reached destination - remove this checkpoint from queue
        useCarStore.getState().removeFirstQueuePosition(car.id);
        // Update rotation after reaching destination (for next checkpoint)
        this.updateCarRotation(car);
        this.updateCarCheckpoints(car);
        this.startCarMovement(car);
      }
    };

    animate();
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 6371;
    const dLat = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const dLng = ((pos2.lng - pos1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((pos1.lat * Math.PI) / 180) *
        Math.cos((pos2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private initEventListeners(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("mapSelection", (e) => {
      const event = e as CustomEvent<{ rect: DOMRect }>;
      this.handleSelectionBox(event.detail.rect);
    });

    window.addEventListener("mapLongPress", (e) => {
      const event = e as CustomEvent<{ x: number; y: number }>;
      this.handleLongPress(event.detail);
    });
  }

  private handleSelectionBox(rect: DOMRect): void {
    const { cars } = useCarStore.getState();
    const { map } = useMapStore.getState();

    if (!map) return;

    // Clear previous selection
    const store = useCarStore.getState();
    store.clearSelection();

    const mapDiv = map.getDiv();
    const mapRect = mapDiv.getBoundingClientRect();

    // Convert selection rectangle to map-relative coordinates
    const selectionRect = {
      left: rect.left - mapRect.left,
      top: rect.top - mapRect.top,
      right: rect.left + rect.width - mapRect.left,
      bottom: rect.top + rect.height - mapRect.top,
    };

    // Use a single overlay to check all cars at once
    const overlay = new google.maps.OverlayView();
    overlay.setMap(map);

    overlay.onAdd = () => {};
    overlay.draw = () => {
      const projection = overlay.getProjection();
      if (!projection) {
        overlay.setMap(null);
        return;
      }

      const selectedCars: Car[] = [];

      cars.forEach((car) => {
        if (!car.marker || !car.position) return;

        const carLatLng = new google.maps.LatLng(
          car.position.lat,
          car.position.lng,
        );
        const carPixel = projection.fromLatLngToContainerPixel(carLatLng);

        if (
          carPixel &&
          carPixel.x >= selectionRect.left &&
          carPixel.x <= selectionRect.right &&
          carPixel.y >= selectionRect.top &&
          carPixel.y <= selectionRect.bottom
        ) {
          selectedCars.push(car);
        }
      });

      // Select all cars that were in the selection box
      selectedCars.forEach((selectedCar) => {
        store.selectCar(selectedCar, false);
      });

      this.updateCarVisuals();
      this.updateCheckpointVisibility();
      overlay.setMap(null);
    };
  }

  private updateCarVisuals(): void {
    const store = useCarStore.getState();
    store.cars.forEach((car) => {
      if (car.marker) {
        this.updateCarRotation(car);
      }
    });
  }

  // Helper method to convert lat/lng to world coordinates
  private project(latLng: Position): google.maps.Point {
    let siny = Math.sin((latLng.lat * Math.PI) / 180);
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);

    return new google.maps.Point(
      256 * (0.5 + latLng.lng / 360),
      256 * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)),
    );
  }

  private handleLongPress(point: { x: number; y: number }): void {
    const { selectedCars } = useCarStore.getState();
    const { map } = useMapStore.getState();

    if (selectedCars.length > 0 && map) {
      const center = map.getCenter();
      if (center) {
        this.moveSelectedCars({
          lat: center.lat(),
          lng: center.lng(),
        });
      }
    }
  }

  getSelectedCars(): Car[] {
    return useCarStore.getState().selectedCars;
  }

  getAllCars(): Car[] {
    return useCarStore.getState().cars;
  }

  clearSelection(): void {
    const store = useCarStore.getState();
    const { cars } = store;

    store.clearSelection();

    cars.forEach((car) => {
      if (car.marker) {
        this.updateCarRotation(car);
      }
    });

    // Update checkpoint visibility when selection changes
    this.updateCheckpointVisibility();
  }

  private createCheckpointMarker(
    position: Position,
    index: number,
  ): google.maps.Marker {
    const { map } = useMapStore.getState();
    if (!map) throw new Error("Map not initialized");

    return new google.maps.Marker({
      position,
      map,
      icon: {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#ffa500" stroke="#ffffff" stroke-width="2"/>
            <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${index + 1}</text>
          </svg>
        `),
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 12),
      },
      zIndex: 1000,
    });
  }

  private createCheckpointLine(
    start: Position,
    end: Position,
  ): google.maps.Polyline {
    const { map } = useMapStore.getState();
    if (!map) throw new Error("Map not initialized");

    return new google.maps.Polyline({
      path: [start, end],
      geodesic: true,
      strokeColor: "#ffa500",
      strokeOpacity: 0.7,
      strokeWeight: 2,
      map,
    });
  }

  private updateCarCheckpoints = (car: Car): void => {
    const { map } = useMapStore.getState();
    const { cars } = useCarStore.getState();
    if (!map) return;

    // Get the fresh car data from store to ensure we have latest moveQueue
    const freshCar = cars.find((c) => c.id === car.id);
    if (!freshCar) return;

    // Clear existing checkpoint markers and lines for this car
    this.clearCarCheckpoints(freshCar.id);

    // Only show checkpoints if car is selected and has a move queue
    if (!freshCar.isSelected || freshCar.moveQueue.length === 0) return;

    const markers: google.maps.Marker[] = [];
    const lines: google.maps.Polyline[] = [];

    // Create markers for each checkpoint
    freshCar.moveQueue.forEach((position, index) => {
      const marker = this.createCheckpointMarker(position, index);
      markers.push(marker);
    });

    // Create lines: car → checkpoint 1 → checkpoint 2 → etc.
    if (freshCar.moveQueue.length > 0) {
      // Line from car to first checkpoint
      const firstLine = this.createCheckpointLine(
        freshCar.position,
        freshCar.moveQueue[0],
      );
      lines.push(firstLine);

      // Lines between consecutive checkpoints
      for (let i = 0; i < freshCar.moveQueue.length - 1; i++) {
        const line = this.createCheckpointLine(
          freshCar.moveQueue[i],
          freshCar.moveQueue[i + 1],
        );
        lines.push(line);
      }
    }

    this.checkpointMarkers.set(freshCar.id, markers);
    this.checkpointLines.set(freshCar.id, lines);
  };

  private clearCarCheckpoints(carId: number): void {
    // Clear checkpoint markers
    const markers = this.checkpointMarkers.get(carId);
    if (markers) {
      markers.forEach((marker) => marker.setMap(null));
      this.checkpointMarkers.delete(carId);
    }

    // Clear checkpoint lines
    const lines = this.checkpointLines.get(carId);
    if (lines) {
      lines.forEach((line) => line.setMap(null));
      this.checkpointLines.delete(carId);
    }
  }

  private updateCheckpointVisibility(): void {
    const { cars } = useCarStore.getState();

    cars.forEach((car) => {
      this.updateCarCheckpoints(car);
    });
  }

  private calculateBearing(start: Position, end: Position): number {
    const dLng = ((end.lng - start.lng) * Math.PI) / 180;
    const lat1 = (start.lat * Math.PI) / 180;
    const lat2 = (end.lat * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  private updateCarRotation(car: Car): void {
    const { cars } = useCarStore.getState();
    const freshCar = cars.find((c) => c.id === car.id);
    if (!freshCar || !freshCar.marker) return;

    let targetPosition: Position | null = null;

    // Find next checkpoint or destination
    if (freshCar.moveQueue.length > 0) {
      targetPosition = freshCar.moveQueue[0];
    }

    if (targetPosition) {
      const rotation = this.calculateBearing(freshCar.position, targetPosition);
      freshCar.marker.setIcon(
        this.createCarIcon(freshCar.isSelected, rotation),
      );
    }
  }
}
