import { create } from 'zustand';
import type { MapState } from './types';

interface MapStore extends MapState {
  setMap: (map: google.maps.Map | null) => void;
  setSpacePressed: (pressed: boolean) => void;
  setSelecting: (selecting: boolean) => void;
  setSelectionStart: (start: { x: number; y: number } | null) => void;
  setSelectionBox: (box: HTMLElement | null) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  map: null,
  isSpacePressed: false,
  isSelecting: false,
  selectionStart: null,
  selectionBox: null,
  
  setMap: (map) => set({ map }),
  setSpacePressed: (isSpacePressed) => set({ isSpacePressed }),
  setSelecting: (isSelecting) => set({ isSelecting }),
  setSelectionStart: (selectionStart) => set({ selectionStart }),
  setSelectionBox: (selectionBox) => set({ selectionBox })
}));