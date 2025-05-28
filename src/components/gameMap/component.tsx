// File: src/components/gameMap/component.tsx
'use client';

import { useRef } from 'react';
import { Paper, Typography, CircularProgress, Alert } from '@mui/material';
import { Game } from '@/lib/game';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { GameMapContainer } from '.';

export const GameMap = () => {
  const gameRef = useRef<Game | null>(null);
  const mapInitialized = useRef(false);

  // Get API key from environment variable
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Show error if no API key is provided
  if (!apiKey) {
    return (
      <GameMapContainer>
        <div className="error-container">
          <Alert severity="error" variant="filled">
            <Typography variant="h6" component="div">
              Google Maps API Key Missing
            </Typography>
            <Typography variant="body2">
              Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file
            </Typography>
          </Alert>
        </div>
      </GameMapContainer>
    );
  }

  const { isLoaded, error } = useGoogleMaps({
    apiKey,
    onLoad: () => {
      if (!mapInitialized.current) {
        try {
          gameRef.current = new Game();
          gameRef.current.initGame();
          mapInitialized.current = true;
        } catch (err) {
          console.error('Failed to initialize game:', err);
        }
      }
    }
  });

  if (error) {
    return (
      <GameMapContainer>
        <div className="error-container">
          <Alert severity="error" variant="filled">
            <Typography variant="h6" component="div">
              Error loading Google Maps
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </div>
      </GameMapContainer>
    );
  }

  if (!isLoaded) {
    return (
      <GameMapContainer>
        <div className="loading-container">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="text.secondary">
            Loading Google Maps...
          </Typography>
        </div>
      </GameMapContainer>
    );
  }

  return (
    <GameMapContainer>
      <div id="map" className="game-map" />
      
      <Paper elevation={3} className="instructions-container">
        <Typography variant="subtitle2" className="instructions-title">
          Controls:
        </Typography>
        <ul className="instructions-list">
          <li className="instructions-item">
            Hold SPACE + drag to move map
          </li>
          <li className="instructions-item">
            Click to select cars
          </li>
          <li className="instructions-item">
            Drag to select multiple cars
          </li>
          <li className="instructions-item">
            Right-click to move selected cars
          </li>
          <li className="instructions-item">
            SHIFT + Right-click to queue destinations
          </li>
        </ul>
      </Paper>
    </GameMapContainer>
  );
};