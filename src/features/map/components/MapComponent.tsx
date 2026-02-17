import { useEffect, useRef, useState } from 'react';
import { Box, Paper } from '@mui/material';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../../utils/constants';
import type { GeoLocation } from '../../../types';

interface MapComponentProps {
  center?: GeoLocation;
  zoom?: number;
  userLocation?: GeoLocation | null;
  markers?: MapMarker[];
  onMapClick?: (location: GeoLocation) => void;
  height?: string | number;
}

export interface MapMarker {
  id: string;
  location: GeoLocation;
  type: 'checkpoint' | 'user' | 'target';
  label?: string;
}

export default function MapComponent({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  userLocation,
  markers = [],
  onMapClick,
  height = '500px',
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const markersLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Inicializace mapy
  useEffect(() => {
    if (!mapRef.current) return;

    // Vrstva s markery
    const markersSource = new VectorSource();
    const markersLayer = new VectorLayer({
      source: markersSource,
      style: createMarkerStyle('checkpoint'),
    });
    markersLayerRef.current = markersLayer;

    // Vrstva s uživatelovou pozicí
    const userSource = new VectorSource();
    const userLayer = new VectorLayer({
      source: userSource,
      style: createMarkerStyle('user'),
    });
    userLayerRef.current = userLayer;

    // Inicializace mapy
    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        markersLayer,
        userLayer,
      ],
      view: new View({
        center: fromLonLat([center.longitude, center.latitude]),
        zoom: zoom,
      }),
    });

    // Handlery pro kliknutí
    if (onMapClick) {
      initialMap.on('click', (event) => {
        const coords = toLonLat(event.coordinate);
        onMapClick({
          longitude: coords[0],
          latitude: coords[1],
        });
      });
    }

    setMap(initialMap);

    return () => {
      initialMap.setTarget(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Spustit jen jednou při mountu

  // Aktualizace centra a zoomu
  useEffect(() => {
    if (!map) return;
    const view = map.getView();
    view.setCenter(fromLonLat([center.longitude, center.latitude]));
    view.setZoom(zoom);
  }, [map, center.latitude, center.longitude, zoom]);

  // Aktualizace markerů
  useEffect(() => {
    if (!markersLayerRef.current) return;

    const source = markersLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    markers.forEach((marker) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([marker.location.longitude, marker.location.latitude])),
        markerType: marker.type,
        markerId: marker.id,
        markerLabel: marker.label,
      });

      feature.setStyle(createMarkerStyle(marker.type));
      source.addFeature(feature);
    });
  }, [markers]);

  // Aktualizace uživatelovy pozice
  useEffect(() => {
    if (!userLayerRef.current) return;

    const source = userLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    if (userLocation) {
      const feature = new Feature({
        geometry: new Point(fromLonLat([userLocation.longitude, userLocation.latitude])),
      });

      feature.setStyle(createMarkerStyle('user'));
      source.addFeature(feature);
    }
  }, [userLocation]);

  return (
    <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
      <Box ref={mapRef} sx={{ width: '100%', height }} />
    </Paper>
  );
}

// Helper funkce pro vytvoření stylu markeru
function createMarkerStyle(type: 'checkpoint' | 'user' | 'target'): Style {
  if (type === 'user') {
    return new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: '#52B788' }), // Svěží zelená z theme
        stroke: new Stroke({
          color: '#fff',
          width: 3,
        }),
      }),
    });
  }

  if (type === 'target') {
    return new Style({
      image: new Circle({
        radius: 10,
        fill: new Fill({ color: '#E9C46A' }), // Písková žlutá z theme
        stroke: new Stroke({
          color: '#1B4332',
          width: 2,
        }),
      }),
    });
  }

  // checkpoint
  return new Style({
    image: new Circle({
      radius: 12,
      fill: new Fill({ color: '#2D6A4F' }), // Lesní zelená z theme
      stroke: new Stroke({
        color: '#fff',
        width: 3,
      }),
    }),
  });
}
