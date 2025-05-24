'use client';

import React, { useEffect, useState, MouseEvent as ReactMouseEvent } from 'react'; // Added useState and ReactMouseEvent
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { Menu, MenuItem } from '@mui/material'; // Added Menu and MenuItem
import { useCarStore, Car } from '@/store/carStore';

const mapContainerStyle = {
  width: '100%',
  height: '100%', // Changed from 100vh to 100%
};

const center = {
  lat: 40.7128,
  lng: -74.0060,
};

const zoom = 12;

const API_KEY = 'AIzaSyCaUDXPNQVQrasPWh_PHC43Ib7_BOPPrRA';

const Map: React.FC = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    // libraries: ['places'], 
  });

  const cars = useCarStore((state) => state.cars);
  const setCars = useCarStore((state) => state.setCars);
  const selectedCarIds = useCarStore((state) => state.selectedCarIds);
  const selectSingleCar = useCarStore((state) => state.selectSingleCar);
  const toggleCarSelection = useCarStore((state) => state.toggleCarSelection);
  const deselectAllCars = useCarStore((state) => state.deselectAllCars);

  // State for context menu
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; car: Car | null } | null>(null);

  useEffect(() => {
    const sampleCarsData: Car[] = [
      { id: 'car1', name: 'Herbie', payload: 'Love Bug', location: { lat: 40.758, lng: -73.9855 }, speed: 50, orientation: 45, connectivity: 'online' },
      { id: 'car2', name: 'KITT', payload: 'Knight Rider', location: { lat: 40.7128, lng: -74.0060 }, speed: 120, orientation: 270, connectivity: 'online' },
    ];
    if (cars.length === 0) {
      setCars(sampleCarsData);
    }
  }, [setCars, cars.length]);

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  if (loadError) {
    return <div>Error loading map</div>;
  }

  if (!isLoaded) {
    return <div>Loading map...</div>;
  }

  // Define marker icons once isLoaded is true
  const defaultMarkerIcon = {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 7,
    fillColor: '#2196F3', // Blue
    fillOpacity: 1,
    strokeWeight: 1,
    rotation: 0, // Default rotation, will be updated by car.orientation
    anchor: new window.google.maps.Point(0, 2.5),
  };

  const selectedMarkerIcon = {
    path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
    scale: 9, // Slightly larger
    fillColor: '#FFC107', // Amber/Yellow for selection
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#000000',
    rotation: 0, // Default rotation, will be updated by car.orientation
    anchor: new window.google.maps.Point(0, 2.5),
  };

  return (
    <> {/* Added React.Fragment to wrap Map and Menu */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onClick={() => deselectAllCars()} // Deselect all cars on map click
      >
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
                e.domEvent.stopPropagation(); // Prevent map click from firing
                if (e.domEvent.shiftKey) {
                  toggleCarSelection(car.id);
                } else {
                  selectSingleCar(car.id);
                }
              }}
              onRightClick={(e) => { // google.maps.MapMouseEvent
                e.domEvent.preventDefault();
                e.domEvent.stopPropagation(); // Prevent map click from firing
                setContextMenu({
                  mouseX: e.domEvent.clientX - 2,
                  mouseY: e.domEvent.clientY - 4,
                  car: car,
                });
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
        MenuListProps={{
          'aria-labelledby': 'basic-button', // Accessibility
        }}
      >
        {contextMenu?.car && ( // Ensure car data is available
          [ // Array to hold menu items
            <MenuItem key="car-name" disabled sx={{ fontWeight: 'bold' }}>
              {contextMenu.car.name}
            </MenuItem>,
            <MenuItem key="cmd1" onClick={() => { console.log('Command 1 for car:', contextMenu.car?.id); handleCloseContextMenu(); }}>
              Command 1
            </MenuItem>,
            <MenuItem key="cmd2" onClick={() => { console.log('Command 2 for car:', contextMenu.car?.id); handleCloseContextMenu(); }}>
              Command 2
            </MenuItem>,
            <MenuItem key="details" onClick={() => { selectSingleCar(contextMenu.car!.id); handleCloseContextMenu(); }}>
              View Details
            </MenuItem>
          ]
        )}
      </Menu>
    </>
  );
};

export default Map;
