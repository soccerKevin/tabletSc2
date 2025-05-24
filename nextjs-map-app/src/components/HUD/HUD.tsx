'use client';

import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Divider, Button, Stack } from '@mui/material'; // Added Button, Stack
import { useCarStore, type Car } from '@/resources/cars';
import { shallow } from 'zustand/shallow';

const HUD: React.FC = () => {
  const { 
    cars, 
    selectedCarIds, 
    selectSingleCar,
    startMovement,    // New
    stopMovement,     // New
    clearCheckpoints  // New
  } = useCarStore(
    (state) => ({
      cars: state.cars,
      selectedCarIds: state.selectedCarIds,
      selectSingleCar: state.selectSingleCar,
      startMovement: state.startMovement,
      stopMovement: state.stopMovement,
      clearCheckpoints: state.clearCheckpoints,
    }),
    shallow
  );

  const selectedCars = cars.filter(car => selectedCarIds.includes(car.id));

  const mainPaperStyle = {
    position: 'fixed' as 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'background.paper',
    maxHeight: '250px', // Adjusted maxHeight for potentially more content
    display: 'flex',    // Added display: 'flex'
    alignItems: 'flex-start', // Align items at the start of the cross axis
  };

  const infoSectionStyle = {
    flexGrow: 1,
    p: 2,
    borderRight: { xs: 'none', sm: '1px solid grey' }, // No border on xs, border on sm and up
    borderBottom: { xs: '1px solid grey', sm: 'none' }, // Border on bottom for xs screens
    maxHeight: '230px', // Adjusted to fit within mainPaperStyle padding
    overflowY: 'auto' as 'auto',
  };

  const commandSectionStyle = {
    p: 2,
    minWidth: { xs: '100%', sm: '220px' }, // Full width on xs, fixed on sm and up
    maxHeight: '230px',
  };
  
  const renderSelectedCarInfo = () => {
    if (selectedCars.length === 0) {
      return (
        <Typography variant="subtitle1" sx={{ textAlign: 'center', p: 2 }}>
          No car selected.
        </Typography>
      );
    }
  
    if (selectedCars.length === 1) {
      const car = selectedCars[0];
      return (
        <Box> {/* No specific padding here, handled by infoSectionStyle */}
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
          <Typography variant="body2">Checkpoints: {car.checkpoints.length}</Typography>
          <Typography variant="body2">Is Moving: {car.isMoving ? 'Yes' : 'No'}</Typography>
          <Typography variant="body2">Target CP Index: {car.currentCheckpointIndex ?? 'N/A'}</Typography>
        </Box>
      );
    }
  
    // selectedCars.length > 1 (Multi-Car Basic View)
    return (
      <>
        <Typography variant="h6" sx={{ pb: 0 }}>
          Multiple Cars Selected ({selectedCars.length})
        </Typography>
        <List dense sx={{ width: '100%'}}>
          {selectedCars.map((car, index) => (
            <React.Fragment key={car.id}>
              <ListItem 
                button 
                onClick={() => selectSingleCar(car.id)}
                sx={{ '&:hover': { backgroundColor: 'action.hover' } }} // Added hover effect
              >
                <ListItemText
                  primary={car.name}
                  secondary={`Payload: ${car.payload} | Status: ${car.connectivity} | CPs: ${car.checkpoints.length}`}
                />
              </ListItem>
              {index < selectedCars.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </>
    );
  };

  return (
    <Paper sx={mainPaperStyle} elevation={3}>
      <Box sx={infoSectionStyle}>
        {renderSelectedCarInfo()}
      </Box>
      <Box sx={commandSectionStyle}>
        <Typography variant="h6" gutterBottom sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
          Commands
        </Typography>
        <Stack spacing={1} direction="column">
          <Button
            variant="contained"
            onClick={() => selectedCarIds.forEach(id => startMovement(id))}
            disabled={selectedCarIds.length === 0}
            size="small"
          >
            Start Movement
          </Button>
          <Button
            variant="outlined"
            onClick={() => selectedCarIds.forEach(id => stopMovement(id))}
            disabled={selectedCarIds.length === 0}
            size="small"
          >
            Stop Movement
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => selectedCarIds.forEach(id => clearCheckpoints(id))}
            disabled={selectedCarIds.length === 0}
            size="small"
          >
            Clear Checkpoints
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default HUD;
