import type { Car } from './types';

export const sampleCarsData: Car[] = [
  {
    id: 'car1',
    name: 'Herbie',
    payload: 'Love Bug',
    location: { lat: 40.758, lng: -73.9855 },
    speed: 50,
    orientation: 45,
    connectivity: 'online',
    checkpoints: [], // Ensure this is present and initialized
    isMoving: false, // Ensure this is present
    currentCheckpointIndex: 0, // Ensure this is present
  },
  {
    id: 'car2',
    name: 'KITT',
    payload: 'Knight Rider',
    location: { lat: 40.7128, lng: -74.0060 },
    speed: 120,
    orientation: 270,
    connectivity: 'online',
    checkpoints: [], // Ensure this is present and initialized
    isMoving: false, // Ensure this is present
    currentCheckpointIndex: 0, // Ensure this is present
  },
];
