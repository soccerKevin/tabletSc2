import type { Position, SelectionBox } from './types';

import type { MapConfig, MapEventHandlers } from './types';
import { DEFAULT_MAP_CONFIG, MAP_CONSTANTS } from './defaults';
import { useMapStore } from './store';

export class MapManager {
  private eventHandlers: MapEventHandlers = {};

  constructor() {
    this.initEventListeners();
  }

  initMap(elementId: string, config: Partial<MapConfig> = {}): google.maps.Map {
    const mapConfig = { 
      ...DEFAULT_MAP_CONFIG, 
      ...config,
      // Disable default dragging - we'll control it manually
      draggable: false,
      gestureHandling: 'none'
    };
    
    const map = new google.maps.Map(
      document.getElementById(elementId) as HTMLElement,
      mapConfig
    );

    useMapStore.getState().setMap(map);
    this.setupMapEvents(map);
    
    return map;
  }

  setEventHandlers(handlers: MapEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  private setupMapEvents(map: google.maps.Map): void {
    // Right-click handler - THIS WAS MISSING PROPER SETUP
    map.addListener('rightclick', (e: google.maps.MapMouseEvent) => {
      e.stop(); // Prevent default context menu
      const position: Position = {
        lat: e.latLng!.lat(),
        lng: e.latLng!.lng()
      };
      console.log('Right click detected at:', position); // Debug log
      this.eventHandlers.onRightClick?.(position, e);
    });

    // Mouse down for selection
    map.addListener('mousedown', (e: google.maps.MapMouseEvent) => {
      const { isSpacePressed } = useMapStore.getState();
      
      if (isSpacePressed) {
        // Enable dragging when space is pressed
        map.setOptions({ draggable: true, gestureHandling: 'cooperative' });
      } else if (e.domEvent && 'button' in e.domEvent && (e.domEvent as MouseEvent).button === 0) {
        // Left click without space - start selection
        const mouseEvent = e.domEvent as MouseEvent;
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        this.startSelection(mouseEvent);
      }
      
      this.eventHandlers.onMouseDown?.(e);
    });

    // Mouse up - disable dragging if space not pressed
    map.addListener('mouseup', (e: google.maps.MapMouseEvent) => {
      const { isSpacePressed } = useMapStore.getState();
      
      if (!isSpacePressed) {
        map.setOptions({ draggable: false, gestureHandling: 'none' });
      }
    });

    // Click handler
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      this.eventHandlers.onClick?.(e);
    });
  }

  private startSelection(event: MouseEvent): void {
    const store = useMapStore.getState();
    
    store.setSelecting(true);
    store.setSelectionStart({
      x: event.clientX,
      y: event.clientY
    });
    
    const selectionBox = document.createElement('div');
    selectionBox.className = MAP_CONSTANTS.SELECTION_BOX_CLASS;
    document.body.appendChild(selectionBox);
    store.setSelectionBox(selectionBox);
    
    const mouseMoveHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.updateSelection(e);
    };
    
    const mouseUpHandler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.endSelection(e);
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  private updateSelection(event: MouseEvent): void {
    const { isSelecting, selectionStart, selectionBox } = useMapStore.getState();
    
    if (!isSelecting || !selectionStart || !selectionBox) return;
    
    const rect: SelectionBox = {
      left: Math.min(selectionStart.x, event.clientX),
      top: Math.min(selectionStart.y, event.clientY),
      width: Math.abs(event.clientX - selectionStart.x),
      height: Math.abs(event.clientY - selectionStart.y)
    };
    
    selectionBox.style.left = rect.left + 'px';
    selectionBox.style.top = rect.top + 'px';
    selectionBox.style.width = rect.width + 'px';
    selectionBox.style.height = rect.height + 'px';
  }

  private endSelection(event: MouseEvent): void {
    const store = useMapStore.getState();
    const { selectionBox } = store;
    
    store.setSelecting(false);
    
    if (selectionBox) {
      const rect = selectionBox.getBoundingClientRect();
      
      // Emit selection event with rectangle bounds
      window.dispatchEvent(new CustomEvent('mapSelection', {
        detail: { rect }
      }));
      
      document.body.removeChild(selectionBox);
      store.setSelectionBox(null);
    }
    
    store.setSelectionStart(null);
  }

  private initEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    // Space bar handling
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        const { map } = useMapStore.getState();
        useMapStore.getState().setSpacePressed(true);
        
        // Enable map dragging when space is pressed
        if (map) {
          map.setOptions({ draggable: true, gestureHandling: 'cooperative' });
        }
        
        e.preventDefault();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        const { map } = useMapStore.getState();
        useMapStore.getState().setSpacePressed(false);
        
        // Disable map dragging when space is released
        if (map) {
          map.setOptions({ draggable: false, gestureHandling: 'none' });
        }
      }
    });

    // Prevent context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.setupTouchEvents();
  }

  private setupTouchEvents(): void {
    if (typeof window === 'undefined') return;
    
    let touchStart: { x: number; y: number } | null = null;
    let touchStartTime: number | null = null;
    
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        touchStartTime = Date.now();
      }
    });
    
    document.addEventListener('touchend', (e) => {
      if (touchStart && touchStartTime && 
          Date.now() - touchStartTime > MAP_CONSTANTS.LONG_PRESS_DURATION) {
        const touch = e.changedTouches[0];
        
        // Emit long press event
        window.dispatchEvent(new CustomEvent('mapLongPress', {
          detail: {
            x: touch.clientX,
            y: touch.clientY
          }
        }));
      }
      touchStart = null;
      touchStartTime = null;
    });
  }

  static rectanglesIntersect(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(rect2.left > rect1.right || 
            rect2.right < rect1.left || 
            rect2.top > rect1.bottom ||
            rect2.bottom < rect1.top);
  }
}