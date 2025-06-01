import type { MapConfig } from "./types";

export const DEFAULT_MAP_CONFIG: MapConfig = {
  zoom: 13,
  center: { lat: 37.7749, lng: -122.4194 }, // San Francisco
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: "cooperative",
};

export const MAP_CONSTANTS = {
  SELECTION_BOX_CLASS: "selection-box",
  LONG_PRESS_DURATION: 500,
} as const;
