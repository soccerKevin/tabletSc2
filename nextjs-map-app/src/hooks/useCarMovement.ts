// nextjs-map-app/src/hooks/useCarMovement.ts
import { useEffect, useRef, useCallback } from 'react';
import { useCarStore } from '@/resources/cars';
import { shallow } from 'zustand/shallow';
import type { Car } from '@/resources/cars';
import type { Checkpoint } from '@/resources/checkpoints/types';

const MOVEMENT_SPEED = 0.0003; // Adjust for desired speed (degrees per frame, roughly)
                              // A real-world speed would require projection and scaling.
                              // This is a simplified "map units per frame".
const CLOSE_ENOUGH_THRESHOLD = 0.0001; // How close to a checkpoint to be considered "arrived"

export function useCarMovement() {
  const { 
    cars, 
    updateCarLocation, 
    advanceToCheckpoint, 
    stopMovement, 
    updateCarOrientation // New action
  } = useCarStore(
    (state) => ({
      cars: state.cars,
      updateCarLocation: state.updateCarLocation,
      advanceToCheckpoint: state.advanceToCheckpoint,
      stopMovement: state.stopMovement,
      updateCarOrientation: state.updateCarOrientation, // Select the new action
    }),
    shallow
  );

  const animationFrameId = useRef<number | null>(null);

  const moveCars = useCallback(() => {
    cars.forEach((car) => {
      if (!car.isMoving || !car.checkpoints || car.checkpoints.length === 0) {
        return;
      }

      const targetIndex = car.currentCheckpointIndex ?? 0;
      if (targetIndex >= car.checkpoints.length) {
        // Should have been stopped by advanceToCheckpoint, but as a safeguard
        if (car.isMoving) stopMovement(car.id);
        return;
      }

      const targetCheckpoint = car.checkpoints[targetIndex];
      const currentLocation = car.location;

      const deltaLat = targetCheckpoint.lat - currentLocation.lat;
      const deltaLng = targetCheckpoint.lng - currentLocation.lng;

      const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);

      if (distance < CLOSE_ENOUGH_THRESHOLD) {
        // Arrived at checkpoint
        advanceToCheckpoint(car.id);
      } else {
        // Move towards checkpoint
        const stepLat = (deltaLat / distance) * MOVEMENT_SPEED;
        const stepLng = (deltaLng / distance) * MOVEMENT_SPEED;

        const newLat = currentLocation.lat + stepLat;
        const newLng = currentLocation.lng + stepLng;

        // Basic orientation towards movement direction
        const newOrientation = (Math.atan2(deltaLng, deltaLat) * 180) / Math.PI;
        // Normalize newOrientation to be between 0 and 360
        const normalizedOrientation = (newOrientation + 360) % 360;

        // Update orientation if it has changed significantly
        if (Math.abs((car.orientation ?? 0) - normalizedOrientation) > 1) {
          updateCarOrientation(car.id, normalizedOrientation);
        }

        updateCarLocation(car.id, { lat: newLat, lng: newLng });
      }
    });

    animationFrameId.current = requestAnimationFrame(moveCars);
  }, [cars, updateCarLocation, advanceToCheckpoint, stopMovement, updateCarOrientation]); // Added updateCarOrientation to dependencies

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(moveCars);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [moveCars]); // useEffect depends on the memoized moveCars
}
