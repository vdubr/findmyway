// Imperativní API mapy (MapComponent přes forwardRef)
import type { GeoLocation } from '../../../types';

export interface MapZoomRef {
  zoomToLocation: (location: GeoLocation, zoom?: number) => void;
  centerOnLocation: (location: GeoLocation) => void;
}
