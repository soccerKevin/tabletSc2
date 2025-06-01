import type { Position } from '@/resources/map/types';

import type { Car, MovementOptions } from './types';
import { useCarStore } from './store';
import { useMapStore } from '@/resources/map/store';
import { DEFAULT_CAR_CONFIG, CAR_CONSTANTS } from './defaults';

export class CarManager {
  private destinationMarkers: google.maps.Marker[] = [];
  private movementLines: google.maps.Polyline[] = [];

  constructor() {
    this.initEventListeners();
  }

  createCar(position: Position, speed: number = DEFAULT_CAR_CONFIG.speed): Car {
    const store = useCarStore.getState();
    const mapStore = useMapStore.getState();
    
    if (!mapStore.map) {
      throw new Error('Map not initialized');
    }

    const car: Car = {
      id: store.carIdCounter,
      position,
      marker: null,
      isSelected: false,
      moveQueue: [],
      isMoving: false,
      element: null,
      speed
    };

    car.marker = new google.maps.Marker({
      position,
      map: mapStore.map,
      title: `Car ${car.id}`,
      icon: this.createCarIcon(false),
      draggable: false
    });

    this.setupCarEvents(car);

    car.element = car.marker as any;
    store.addCar(car);
    return car;
  }

  private setupCarEvents(car: Car): void {
    if (!car.marker) return;
    
    car.marker.addListener('click', (e: google.maps.MapMouseEvent) => {
      e.stop();
      const mouseEvent = e.domEvent as MouseEvent;
      this.selectCar(car, !mouseEvent?.ctrlKey && !mouseEvent?.metaKey);
    });
  }

  private createCarIcon(isSelected: boolean): google.maps.Icon {
    const size = isSelected ? 45 : 30;
    const color = isSelected ? '#00ff00' : '#4285f4';
    const strokeWidth = isSelected ? 4 : 2;
    const glowEffect = isSelected ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2 + 3}" fill="none" stroke="#00ff00" stroke-width="2" opacity="0.6"/>` : '';
    
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="${size + 6}" height="${size + 6}" viewBox="0 0 ${size + 6} ${size + 6}" xmlns="http://www.w3.org/2000/svg">
          ${glowEffect}
          <circle cx="${(size + 6)/2}" cy="${(size + 6)/2}" r="${size/2 - strokeWidth}" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}"/>
          <text x="${(size + 6)/2}" y="${(size + 6)/2 + 6}" text-anchor="middle" fill="white" font-size="${Math.floor(size * 0.5)}" font-weight="bold">${DEFAULT_CAR_CONFIG.icon}</text>
        </svg>
      `),
      scaledSize: new google.maps.Size(size + 6, size + 6),
      anchor: new google.maps.Point((size + 6)/2, (size + 6)/2)
    };
  }

  selectCar(car: Car, clearOthers: boolean = true): void {
    const store = useCarStore.getState();
    store.selectCar(car, clearOthers);
    
    const updatedCars = store.cars;
    updatedCars.forEach(c => {
      if (c.marker) {
        c.marker.setIcon(this.createCarIcon(c.isSelected));
      }
    });
  }

  moveSelectedCars(destination: Position, options: MovementOptions = {}): void {
    const { selectedCars } = useCarStore.getState();
    const { map } = useMapStore.getState();
    
    if (!map || selectedCars.length === 0) return;

    this.createDestinationMarker(destination, map);
    
    selectedCars.forEach(car => {
      this.createMovementLine(car.position, destination, map);
      this.moveCar(car, destination, options);
    });
  }

  private createDestinationMarker(position: Position, map: google.maps.Map): void {
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

    this.destinationMarkers.push(marker);
    
    setTimeout(() => {
      marker.setMap(null);
      const index = this.destinationMarkers.indexOf(marker);
      if (index > -1) {
        this.destinationMarkers.splice(index, 1);
      }
    }, 5000);
  }

  private createMovementLine(start: Position, end: Position, map: google.maps.Map): void {
    const line = new google.maps.Polyline({
      path: [start, end],
      geodesic: true,
      strokeColor: '#00ff00',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map
    });

    this.movementLines.push(line);
    
    setTimeout(() => {
      line.setMap(null);
      const index = this.movementLines.indexOf(line);
      if (index > -1) {
        this.movementLines.splice(index, 1);
      }
    }, 3000);
  }

  moveCar(car: Car, destination: Position, options: MovementOptions = {}): void {
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
  }

  private startCarMovement(car: Car): void {
    const store = useCarStore.getState();
    const nextPosition = store.getNextQueuePosition(car.id);
    
    if (!nextPosition) {
      store.setCarMoving(car.id, false);
      return;
    }
    
    store.setCarMoving(car.id, true);
    this.animateCarMovement(car, nextPosition);
  }

  private animateCarMovement(car: Car, destination: Position): void {
    const start = car.position;
    const distance = this.calculateDistance(start, destination);
    const duration = Math.max((distance / car.speed) * 3600000, 500);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const lat = start.lat + (destination.lat - start.lat) * progress;
      const lng = start.lng + (destination.lng - start.lng) * progress;
      
      const newPosition = { lat, lng };
      
      useCarStore.getState().updateCarPosition(car.id, newPosition);
      
      if (car.marker) {
        car.marker.setPosition(newPosition);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.startCarMovement(car);
      }
    };
    
    animate();
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    const R = 6371;
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private initEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('mapSelection', (e) => {
      const event = e as CustomEvent<{ rect: DOMRect }>;
      this.handleSelectionBox(event.detail.rect);
    });

    window.addEventListener('mapLongPress', (e) => {
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
    
    const selectedCars: Car[] = [];
    const mapDiv = map.getDiv();
    const mapRect = mapDiv.getBoundingClientRect();
    
    // Convert selection rectangle to map-relative coordinates
    const selectionRect = {
      left: rect.left - mapRect.left,
      top: rect.top - mapRect.top,
      right: rect.left + rect.width - mapRect.left,
      bottom: rect.top + rect.height - mapRect.top
    };
    
    // Check each car using Google Maps projection
    cars.forEach(car => {
      if (!car.marker || !car.position) return;
      
      // Create a temporary overlay to get projection
      const overlay = new google.maps.OverlayView();
      overlay.setMap(map);
      
      overlay.onAdd = () => {};
      overlay.draw = () => {
        const projection = overlay.getProjection();
        if (!projection) {
          overlay.setMap(null);
          return;
        }
        
        const carLatLng = new google.maps.LatLng(car.position.lat, car.position.lng);
        const carPixel = projection.fromLatLngToContainerPixel(carLatLng);
        
        if (carPixel && 
            carPixel.x >= selectionRect.left && 
            carPixel.x <= selectionRect.right &&
            carPixel.y >= selectionRect.top && 
            carPixel.y <= selectionRect.bottom) {
          selectedCars.push(car);
        }
        
        overlay.setMap(null);
      };
    });
    
    // Apply selections after a short delay to allow overlays to process
    setTimeout(() => {
      selectedCars.forEach(selectedCar => {
        store.selectCar(selectedCar, false);
      });
      this.updateCarVisuals();
    }, 50);
  }
  
  private updateCarVisuals(): void {
    const store = useCarStore.getState();
    store.cars.forEach(car => {
      if (car.marker) {
        car.marker.setIcon(this.createCarIcon(car.isSelected));
      }
    });
  }
  
  // Helper method to convert lat/lng to world coordinates
  private project(latLng: Position): google.maps.Point {
    let siny = Math.sin(latLng.lat * Math.PI / 180);
    siny = Math.min(Math.max(siny, -0.9999), 0.9999);
    
    return new google.maps.Point(
      256 * (0.5 + latLng.lng / 360),
      256 * (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI))
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
          lng: center.lng()
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
    
    cars.forEach(car => {
      if (car.marker) {
        car.marker.setIcon(this.createCarIcon(false));
      }
    });
  }
}