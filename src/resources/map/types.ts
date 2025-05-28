import type { Position } from '@/types/common';

export interface MapConfig {
  zoom: number;
  center: Position;
  disableDefaultUI: boolean;
  zoomControl: boolean;
  gestureHandling: string;
}

export interface MapEventHandlers {
  onRightClick?: (position: Position, event: google.maps.MapMouseEvent) => void;
  onMouseDown?: (event: google.maps.MapMouseEvent) => void;
  onClick?: (event: google.maps.MapMouseEvent) => void;
}

export interface MapState {
  map: google.maps.Map | null;
  isSpacePressed: boolean;
  isSelecting: boolean;
  selectionStart: { x: number; y: number } | null;
  selectionBox: HTMLElement | null;
}