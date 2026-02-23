// Hook pro správu zoom funkcionality mapy

import { useCallback, useRef } from 'react';
import type { GeoLocation } from '../../../types';

// Typ pro imperativní API mapy
export interface MapZoomRef {
  zoomToLocation: (location: GeoLocation, zoom?: number) => void;
}

// Výchozí zoom level při zoomování na checkpoint
const DEFAULT_ZOOM_LEVEL = 17;

export function useMapZoom() {
  const mapZoomRef = useRef<MapZoomRef | null>(null);

  // Callback pro registraci mapy
  const registerMap = useCallback((ref: MapZoomRef | null) => {
    mapZoomRef.current = ref;
  }, []);

  // Funkce pro zoom na konkrétní lokaci
  const zoomToLocation = useCallback((location: GeoLocation, zoom: number = DEFAULT_ZOOM_LEVEL) => {
    if (mapZoomRef.current) {
      mapZoomRef.current.zoomToLocation(location, zoom);
    }
  }, []);

  return {
    registerMap,
    zoomToLocation,
  };
}
