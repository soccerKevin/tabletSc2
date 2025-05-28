// File: src/resources/car/types.ts
import type { Position } from '@/types/common';

export interface Car {
  id: number;
  position: Position;
  marker: google.maps.Marker | null; // Changed from AdvancedMarkerElement
  isSelected: boolean;
  moveQueue: Position[];
  isMoving: boolean;
  element: any; // Keep for compatibility
  speed: number; // km/h
}

export interface CarState {
  cars: Car[];
  selectedCars: Car[];
  carIdCounter: number;
}

export interface MovementOptions {
  speed?: number;
  addToQueue?: boolean;
}