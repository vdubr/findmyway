// Mini mapa pro vyber/editaci pozice checkpointu v editoru
// Obsahuje jeden marker ktery se da pretahnout (drag & drop) nebo kliknout na novou pozici

import { Box } from '@mui/material';
import { Feature } from 'ol';
import Collection from 'ol/Collection';
import { Point } from 'ol/geom';
import Translate from 'ol/interaction/Translate';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OLMap from 'ol/Map';
import { fromLonLat, toLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import View from 'ol/View';
import { useCallback, useEffect, useRef } from 'react';
import 'ol/ol.css';

interface MiniMapPickerProps {
  latitude: number;
  longitude: number;
  label?: string;
  onChange: (lat: number, lng: number) => void;
  height?: string | number;
}

// Styl pro checkpoint marker (zeleny kruh s bilym textem)
function createCheckpointStyle(label?: string): Style {
  return new Style({
    image: new Circle({
      radius: 14,
      fill: new Fill({ color: '#2D6A4F' }),
      stroke: new Stroke({
        color: '#fff',
        width: 3,
      }),
    }),
    text: label
      ? new Text({
          text: label,
          fill: new Fill({ color: '#fff' }),
          font: 'bold 13px sans-serif',
          offsetY: 1,
        })
      : undefined,
  });
}

export default function MiniMapPicker({
  latitude,
  longitude,
  label,
  onChange,
  height = 250,
}: MiniMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OLMap | null>(null);
  const markerFeatureRef = useRef<Feature | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Ref pro sledovani zda se marker prave tahne (aby se neaktualizoval z props)
  const isDraggingRef = useRef(false);

  // Inicializace mapy (záměrně jednou – guard `mapRef.current` zabraňuje re-inicializaci)
  // biome-ignore lint/correctness/useExhaustiveDependencies: záměrně prázdné deps – mapa se inicializuje pouze jednou
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const markerFeature = new Feature({
      geometry: new Point(fromLonLat([longitude, latitude])),
    });
    markerFeature.setStyle(createCheckpointStyle(label));
    markerFeatureRef.current = markerFeature;

    const vectorSource = new VectorSource({
      features: [markerFeature],
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([longitude, latitude]),
        zoom: 16,
      }),
      controls: [],
    });

    // Drag interakce pro marker
    const translate = new Translate({
      features: new Collection([markerFeature]),
    });

    translate.on('translatestart', () => {
      isDraggingRef.current = true;
    });

    translate.on('translateend', (evt) => {
      isDraggingRef.current = false;
      const geometry = evt.features.item(0).getGeometry() as Point;
      const coords = toLonLat(geometry.getCoordinates());
      onChangeRef.current(coords[1], coords[0]);
    });

    map.addInteraction(translate);

    // Klik na mapu presune marker
    map.on('click', (evt) => {
      const coords = toLonLat(evt.coordinate);
      const newLat = coords[1];
      const newLng = coords[0];

      markerFeature.setGeometry(new Point(evt.coordinate));
      onChangeRef.current(newLat, newLng);
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Aktualizovat pozici markeru kdyz se zmeni props (ale ne pri drag)
  useEffect(() => {
    if (!markerFeatureRef.current || isDraggingRef.current) return;

    const newCoords = fromLonLat([longitude, latitude]);
    const currentGeom = markerFeatureRef.current.getGeometry() as Point;
    const currentCoords = currentGeom.getCoordinates();

    // Aktualizovat jen pokud se pozice skutecne zmenila (aby nedoslo ke smycce)
    if (
      Math.abs(currentCoords[0] - newCoords[0]) > 0.01 ||
      Math.abs(currentCoords[1] - newCoords[1]) > 0.01
    ) {
      markerFeatureRef.current.setGeometry(new Point(newCoords));
      // Centrovat mapu na novou pozici
      mapRef.current?.getView().animate({
        center: newCoords,
        duration: 300,
      });
    }
  }, [latitude, longitude]);

  // Aktualizovat label markeru
  const updateLabel = useCallback((newLabel?: string) => {
    if (markerFeatureRef.current) {
      markerFeatureRef.current.setStyle(createCheckpointStyle(newLabel));
    }
  }, []);

  useEffect(() => {
    updateLabel(label);
  }, [label, updateLabel]);

  return (
    <Box
      ref={mapContainerRef}
      sx={{
        width: '100%',
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  );
}
