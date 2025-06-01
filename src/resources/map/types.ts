export interface Position {
  lat: number;
  lng: number;
}

export interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TouchPoint {
  x: number;
  y: number;
}

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
