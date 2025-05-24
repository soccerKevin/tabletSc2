import { useCarStore, type Car, type CarStoreState } from '@/resources/cars'; // Updated import path
import { render, screen, fireEvent } from '@testing-library/react';
import HUD from './HUD';
import '@testing-library/jest-dom';

// Mock the store
jest.mock('@/resources/cars'); // Updated mock path

// Helper to set mock store state
// We need to mock the return value of useCarStore, which is a function that takes a selector
// The selector then operates on the store's state.
const mockSetCarStoreData = (mockData: Partial<CarStoreState>) => { // Renamed function
  (useCarStore as jest.Mock).mockImplementation((selector: (state: CarStoreState) => any) => {
    // For a more robust mock, especially if your store has complex actions or initializers:
    // const actualStore = jest.requireActual('@/resources/cars');
    // const store = { ...actualStore.create(() => ({}))(), ...mockData };
    // The selector passed from the component (e.g., state => ({ cars: state.cars, ... }))
    // will be called with the mockData.
    return selector(mockData as CarStoreState);
  });
};


// Sample car data for tests
const sampleCar1: Car = { id: 'car1', name: 'Test Car 1', payload: 'Payload 1', location: { lat: 10, lng: 10 }, speed: 60, orientation: 90, connectivity: 'online' };
const sampleCar2: Car = { id: 'car2', name: 'Test Car 2', payload: 'Payload 2', location: { lat: 20, lng: 20 }, speed: 80, orientation: 180, connectivity: 'offline' };

describe('HUD Component', () => {
  it('renders "No car selected" when no cars are selected', () => {
    mockSetCarStoreData({ // Use renamed helper
      cars: [sampleCar1], 
      selectedCarIds: [], 
      selectSingleCar: jest.fn() 
    });
    render(<HUD />);
    expect(screen.getByText('No car selected.')).toBeInTheDocument();
  });

  it('displays details for a single selected car', () => {
    mockSetCarStoreData({ // Use renamed helper
      cars: [sampleCar1, sampleCar2],
      selectedCarIds: ['car1'],
      selectSingleCar: jest.fn(),
    });
    render(<HUD />);
    expect(screen.getByText('Test Car 1 - Details')).toBeInTheDocument();
    expect(screen.getByText(`ID: ${sampleCar1.id}`)).toBeInTheDocument();
    expect(screen.getByText(`Payload: ${sampleCar1.payload}`)).toBeInTheDocument();
    expect(screen.getByText(`Location: ${sampleCar1.location.lat.toFixed(4)}, ${sampleCar1.location.lng.toFixed(4)}`)).toBeInTheDocument();
    expect(screen.getByText(`Speed: ${sampleCar1.speed} units`)).toBeInTheDocument();
    expect(screen.getByText(`Orientation: ${sampleCar1.orientation}°`)).toBeInTheDocument();
    expect(screen.getByText(`Connectivity: ${sampleCar1.connectivity}`)).toBeInTheDocument();
  });

  it('displays a list when multiple cars are selected', () => {
    mockSetCarStoreData({ // Use renamed helper
      cars: [sampleCar1, sampleCar2],
      selectedCarIds: ['car1', 'car2'],
      selectSingleCar: jest.fn(),
    });
    render(<HUD />);
    expect(screen.getByText('Multiple Cars Selected (2)')).toBeInTheDocument();
    // Check for car names within list items. The text might be part of a larger string.
    expect(screen.getByText((content, element) => content.startsWith(sampleCar1.name) && element?.tagName.toLowerCase() === 'span')).toBeInTheDocument();
    expect(screen.getByText((content, element) => content.startsWith(sampleCar2.name) && element?.tagName.toLowerCase() === 'span')).toBeInTheDocument();

  });

  it('calls selectSingleCar when a car is clicked in multi-select view', () => {
    const mockSelectSingleCar = jest.fn();
    mockSetCarStoreData({ // Use renamed helper
      cars: [sampleCar1, sampleCar2],
      selectedCarIds: ['car1', 'car2'],
      selectSingleCar: mockSelectSingleCar,
    });
    render(<HUD />);
    // The clickable element is the ListItem, which contains the ListItemText primary prop as a span
    const car1ListItemText = screen.getByText((content, element) => content.startsWith(sampleCar1.name) && element?.tagName.toLowerCase() === 'span');
    // The parent of the span is the ListItemText, its parent is the clickable ListItem (div role=button)
    fireEvent.click(car1ListItemText.closest('li')!);
    expect(mockSelectSingleCar).toHaveBeenCalledWith(sampleCar1.id);
  });
});
