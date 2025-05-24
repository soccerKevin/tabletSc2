'use client';

import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useCarStore, Car } from '@/store/carStore';

const HUD: React.FC = () => {
  const cars = useCarStore((state) => state.cars);
  const selectedCarIds = useCarStore((state) => state.selectedCarIds);
  const selectSingleCar = useCarStore((state) => state.selectSingleCar);

  const selectedCars = cars.filter(car => selectedCarIds.includes(car.id));

  const hudStyle = {
    position: 'fixed' as 'fixed', // Type assertion for CSS position
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Above map controls
    padding: 2,
    backgroundColor: 'background.paper',
    maxHeight: '200px',
    overflowY: 'auto' as 'auto', // Type assertion for CSS overflowY
  };

  if (selectedCars.length === 0) {
    return (
      <Paper sx={hudStyle} elevation={3}>
        <Typography variant="subtitle1" sx={{ textAlign: 'center', p: 2 }}>
          No car selected.
        </Typography>
      </Paper>
    );
  }

  if (selectedCars.length === 1) {
    const car = selectedCars[0];
    return (
      <Paper sx={hudStyle} elevation={3}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">{car.name} - Details</Typography>
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2">ID: {car.id}</Typography>
          <Typography variant="body2">Payload: {car.payload}</Typography>
          <Typography variant="body2">
            Location: {car.location.lat.toFixed(4)}, {car.location.lng.toFixed(4)}
          </Typography>
          <Typography variant="body2">Speed: {car.speed} units</Typography>
          <Typography variant="body2">Orientation: {car.orientation}°</Typography>
          <Typography variant="body2">Connectivity: {car.connectivity}</Typography>
        </Box>
      </Paper>
    );
  }

  // selectedCars.length > 1 (Multi-Car Basic View)
  return (
    <Paper sx={hudStyle} elevation={3}>
      <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
        Multiple Cars Selected ({selectedCars.length})
      </Typography>
      <List dense>
        {selectedCars.map((car, index) => (
          <React.Fragment key={car.id}>
            <ListItem button onClick={() => selectSingleCar(car.id)}>
              <ListItemText
                primary={car.name}
                secondary={`Payload: ${car.payload} | Status: ${car.connectivity}`}
              />
            </ListItem>
            {index < selectedCars.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default HUD;
