// Car related type definitions will go here
import type { Checkpoint } from '@/resources/checkpoints/types';

export interface Car {
  id: string;
  name: string;
  payload: string;
  location: { lat: number; lng: number };
  speed: number;
  orientation: number; // degrees from North
  connectivity: 'online' | 'offline' | 'poor';
  checkpoints: Checkpoint[];
  isMoving?: boolean; // Added field
  currentCheckpointIndex?: number; // Added field
}
