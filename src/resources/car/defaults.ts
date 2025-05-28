export const DEFAULT_CAR_CONFIG = {
  speed: 200, // km/h (4x faster)
  icon: '🚗',
  size: {
    width: 30,
    height: 30
  },
  fontSize: '24px'
} as const;

export const CAR_CONSTANTS = {
  SELECTED_CLASS: 'selected',
  MARKER_CLASS: 'car-marker'
} as const;