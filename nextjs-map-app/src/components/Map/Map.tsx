'use client';

import React, { useEffect, useState, MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, Polyline } from '@react-google-maps/api'; // Added Polyline
import { Menu, MenuItem } from '@mui/material';
import { useCarStore, type Car, defaults as carDefaults } from '@/resources/cars';
import { shallow } from 'zustand/shallow';
import type { Checkpoint } from '@/resources/checkpoints/types';
import { useCarMovement } from '@/hooks/useCarMovement'; // Import the hook

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 40.7128,
  lng: -74.0060,
};

const zoom = 12;

// const API_KEY = 'AIzaSyCaUDXPNQVQrasPWh_PHC43Ib7_BOPPrRA'; // Removed hardcoded API key

const Map: React.FC = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", // Use environment variable
  });

  const {
    cars,
    setCars,
    selectedCarIds,
    selectSingleCar,
    toggleCarSelection,
    deselectAllCars,
    setCheckpoints,
    appendCheckpoint,
    startMovement, // Add to selector
    stopMovement   // Add to selector
  } = useCarStore(
    (state) => ({
      cars: state.cars,
      setCars: state.setCars,
      selectedCarIds: state.selectedCarIds,
      selectSingleCar: state.selectSingleCar,
      toggleCarSelection: state.toggleCarSelection,
      deselectAllCars: state.deselectAllCars,
      setCheckpoints: state.setCheckpoints,
      appendCheckpoint: state.appendCheckpoint,
      startMovement: state.startMovement, // Select startMovement
      stopMovement: state.stopMovement,   // Select stopMovement
    }),
    shallow
  );

  useCarMovement(); // Call the hook

  );

  useCarMovement(); // Call the hook

  );

  useCarMovement(); // Call the hook

  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; car: Car | null } | null>(null);
  
  // State for selection box drawing
  const [selectionBox, setSelectionBox] = useState<google.maps.Rectangle | null>(null);
  const [selectionOrigin, setSelectionOrigin] = useState<google.maps.LatLng | null>(null);
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const spaceBarPressedRef = useRef(false); // Ref to track spacebar state

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    map.setOptions({ draggable: false });
    setMapInstance(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMapInstance(null);
    if (selectionBox) { // Clean up selection box if map unmounts
        selectionBox.setMap(null);
        setSelectionBox(null);
    }
  }, [selectionBox]);

  useEffect(() => {
    if (cars.length === 0) {
      setCars(carDefaults.sampleCarsData);
    }
  }, [cars.length, setCars]);

  // Effect for Spacebar map panning
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        spaceBarPressedRef.current = true; // Track spacebar press
        if (mapInstance && !mapInstance.getDraggable()) {
          mapInstance.setOptions({ draggable: true });
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        spaceBarPressedRef.current = false; // Reset spacebar state
        if (mapInstance && mapInstance.getDraggable()) {
          mapInstance.setOptions({ draggable: false });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (mapInstance && mapInstance.getDraggable()) {
        mapInstance.setOptions({ draggable: false });
      }
    };
  }, [mapInstance]);


  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };
  
  const clearSelectionRectangle = useCallback(() => {
    if (selectionBox) {
      selectionBox.setMap(null);
      setSelectionBox(null);
    }
    setIsDrawingSelection(false);
    setSelectionOrigin(null);
  }, [selectionBox]);

  const handleMapRightClick = (event: google.maps.MapMouseEvent) => {
    (event as any).domEvent.preventDefault();
    (event as any).domEvent.stopPropagation();

    if (!event.latLng || spaceBarPressedRef.current) return; // Do not trigger context menu if space is pressed

    if (selectedCarIds.length === 0) {
      console.log('No cars selected to assign checkpoint.');
      return;
    }
    // ... (rest of the checkpoint logic remains the same)
    const newCheckpoint: Checkpoint = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
      type: 'standard',
    };

    const shiftPressed = (event as any).domEvent.shiftKey;

    selectedCarIds.forEach(carId => {
      if (shiftPressed) {
        appendCheckpoint(carId, newCheckpoint);
      } else {
        setCheckpoints(carId, [newCheckpoint]);
      }
    });
  };

  // Mouse event handlers for selection box
  const handleMapMouseDown = (event: google.maps.MapMouseEvent) => {
    if (spaceBarPressedRef.current || (mapInstance && mapInstance.getDraggable())) {
      return; // In panning mode, don't start selection
    }
    // Check if the click was on a marker (more robust check might be needed if MarkerF doesn't stop propagation)
    // For now, we assume if this event fires, it's on the map.
    if (event.domEvent.target && (event.domEvent.target as HTMLElement).closest('[aria-label^="Marker"]')) {
        return; // Click was on a marker or its label
    }


    clearSelectionRectangle(); // Clear previous selection box
    deselectAllCars(); // Deselect cars when starting a new selection draw

    if (mapInstance && event.latLng) {
      const newRect = new window.google.maps.Rectangle({
        map: mapInstance,
        bounds: new window.google.maps.LatLngBounds(event.latLng, event.latLng),
        strokeColor: '#0000FF',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#0000FF',
        fillOpacity: 0.15,
        clickable: false,
        draggable: false,
        editable: false,
      });
      setSelectionBox(newRect);
      setSelectionOrigin(event.latLng);
      setIsDrawingSelection(true);
    }
  };

  const handleMapMouseMove = (event: google.maps.MapMouseEvent) => {
    if (isDrawingSelection && selectionOrigin && selectionBox && event.latLng) {
      const newBounds = new window.google.maps.LatLngBounds(selectionOrigin);
      newBounds.extend(event.latLng);
      selectionBox.setBounds(newBounds);
    }
  };

  const handleMapMouseUp = useCallback((event: google.maps.MapMouseEvent) => {
    if (isDrawingSelection) {
      setIsDrawingSelection(false);
      // setSelectionOrigin(null); // Resetting origin is handled by next mousedown via clearSelectionRectangle

      if (selectionBox) {
        const bounds = selectionBox.getBounds();
        if (bounds) {
          // const allCars = cars; // cars is already available from useCarStore
          const carsInBounds = cars.filter(car => {
            const carLatLng = new window.google.maps.LatLng(car.location.lat, car.location.lng);
            return bounds.contains(carLatLng);
          });
          const carIdsInBounds = carsInBounds.map(car => car.id);
          setSelectedCarIds(carIdsInBounds);
          
          // Optional: Clear the visual selection box immediately after selection
          // clearSelectionRectangle(); 
          // Current behavior: box cleared on next map click, marker click, or new selection mousedown.
        }
      }
    }
    // Reset cursors if they were changed
    if (mapInstance && mapInstance.get('draggableCursor') === 'crosshair') {
      mapInstance.setOptions({ draggableCursor: '', draggingCursor: '' });
    }
  }, [isDrawingSelection, selectionBox, cars, setSelectedCarIds, mapInstance, clearSelectionRectangle]); // Added dependencies


  if (loadError) {
    return <div>Error loading map</div>;
  }

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  const defaultMarkerIcon = {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 7,
    fillColor: '#2196F3',
    fillOpacity: 1,
    strokeWeight: 1,
    rotation: 0,
    anchor: new window.google.maps.Point(0, 2.5),
  };

  const selectedMarkerIcon = {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 9,
    fillColor: '#FFC107',
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#000000',
    rotation: 0,
    anchor: new window.google.maps.Point(0, 2.5),
  };

  const checkpointMarkerIcon = {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 6,
    fillColor: 'green',
    fillOpacity: 0.8,
    strokeWeight: 1,
    strokeColor: 'darkgreen',
  };

  // New function for checkpoint icons
  const getCheckpointMarkerIcon = (checkpoint: Checkpoint, index: number, isSelectedCarCheckpoint: boolean) => {
    let fillColor = 'green'; // Default
    // Example: if (checkpoint.type === 'pickup') fillColor = 'blue';
    // Example: if (checkpoint.type === 'dropoff') fillColor = 'red';

    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: isSelectedCarCheckpoint ? 6 : 4, // Larger for selected car's checkpoints
      fillColor,
      fillOpacity: 0.9,
      strokeWeight: 1,
      strokeColor: 'white', // Changed from darkgreen for better visibility of label
      labelOrigin: new window.google.maps.Point(0, 0), // Centered label
    };
  };
  
  const checkpointsToDisplay = cars
    .filter(car => selectedCarIds.includes(car.id))
    .flatMap(car => car.checkpoints.map((cp, index) => ({ 
      ...cp, 
      carId: car.id, 
      checkpointIndex: index 
    })));

  return (
    <>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={{ 
            gestureHandling: 'auto', 
            draggableCursor: isDrawingSelection ? 'crosshair' : undefined, // Change cursor when drawing
            draggingCursor: isDrawingSelection ? 'crosshair' : undefined,
        }}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={() => { 
            deselectAllCars(); 
            clearSelectionRectangle(); 
        }}
        onRightClick={handleMapRightClick}
        onMouseDown={handleMapMouseDown}
        onMouseMove={handleMapMouseMove}
        onMouseUp={handleMapMouseUp}
      >
        {/* Car Markers */}
        {cars.map((car) => {
          const isSelected = selectedCarIds.includes(car.id);
          const icon = isSelected 
            ? { ...selectedMarkerIcon, rotation: car.orientation } 
            : { ...defaultMarkerIcon, rotation: car.orientation };

          return (
            <MarkerF
              key={car.id}
              position={car.location}
              label={car.name + " (" + car.payload + ")"}
              icon={icon}
              onClick={(e) => {
                e.domEvent.stopPropagation();
                clearSelectionRectangle(); // Clear selection box on marker click
                if (e.domEvent.shiftKey) {
                  toggleCarSelection(car.id);
                } else {
                  selectSingleCar(car.id);
                }
              }}
              onRightClick={(e) => {
                e.domEvent.preventDefault();
                e.domEvent.stopPropagation();
                setContextMenu({
                  mouseX: e.domEvent.clientX - 2,
                  mouseY: e.domEvent.clientY - 4,
                  car: car,
                });
              }}
            />
          );
        })}

        {/* Checkpoint Markers */}
        {checkpointsToDisplay.map((checkpoint) => (
          <MarkerF
            key={`cp-${checkpoint.carId}-${checkpoint.checkpointIndex}`}
            position={{ lat: checkpoint.lat, lng: checkpoint.lng }}
            label={{
              text: (checkpoint.checkpointIndex + 1).toString(),
              color: "white",
              fontWeight: "bold",
              fontSize: "10px",
            }}
            icon={getCheckpointMarkerIcon(checkpoint, checkpoint.checkpointIndex, true)}
            // Optional: Add onClick for checkpoints if needed later
          />
        ))}

        {/* Polylines for Selected Car Paths */}
        {cars
          .filter(car => selectedCarIds.includes(car.id) && car.checkpoints.length >= 1) // Show polyline even for 1 CP (though it won't draw)
          .map(car => {
            const pathCoordinates = car.checkpoints.map(cp => ({ lat: cp.lat, lng: cp.lng }));
            // Add current car location as the first point of the path if it's moving towards the first checkpoint
            if (car.isMoving && car.checkpoints.length > 0 && (car.currentCheckpointIndex ?? 0) < car.checkpoints.length) {
                 pathCoordinates.unshift({ lat: car.location.lat, lng: car.location.lng });
            }

            return (
              <Polyline
                key={`path-${car.id}`}
                path={pathCoordinates}
                options={{
                  strokeColor: '#FF0000', // Red, as per current subtask
                  strokeOpacity: 0.8,
                  strokeWeight: 2,      // As per current subtask
                  geodesic: true,
                  zIndex: 1, 
                }}
              />
            );
          })}
      </GoogleMap>
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        MenuListProps={{ 'aria-labelledby': 'basic-button' }}
      >
        {contextMenu?.car && (
          [
            <MenuItem key="car-name" disabled sx={{ fontWeight: 'bold' }}>
              {contextMenu.car.name}
            </MenuItem>,
            <MenuItem key="start" onClick={() => { if(contextMenu.car) startMovement(contextMenu.car.id); handleCloseContextMenu(); }}>
              Start Movement
            </MenuItem>,
            <MenuItem key="stop" onClick={() => { if(contextMenu.car) stopMovement(contextMenu.car.id); handleCloseContextMenu(); }}>
              Stop Movement
            </MenuItem>,
            <MenuItem key="details" onClick={() => { if(contextMenu.car) selectSingleCar(contextMenu.car.id); handleCloseContextMenu(); }}>
              View Details
            </MenuItem>
          ]
        )}
      </Menu>
    </>
  );
};

export default Map;
