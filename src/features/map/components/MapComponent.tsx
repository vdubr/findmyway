import { Box, Paper } from "@mui/material";
import { Feature } from "ol";
import { Circle as CircleGeom, Point } from "ol/geom";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import { fromLonLat, toLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";
import View from "ol/View";
import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import type { GeoLocation } from "../../../types";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../../../utils/constants";

interface MapComponentProps {
  center?: GeoLocation;
  zoom?: number;
  userLocation?: GeoLocation | null;
  userAccuracy?: number | null; // GPS přesnost v metrech
  markers?: MapMarker[];
  onMapClick?: (location: GeoLocation) => void;
  height?: string | number;
}

export interface MapMarker {
  id: string;
  location: GeoLocation;
  type: "checkpoint" | "user" | "target";
  label?: string;
}

export default function MapComponent({
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  userLocation,
  userAccuracy,
  markers = [],
  onMapClick,
  height = "500px",
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const markersLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const accuracyLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const clickHandlerRef = useRef<((event: any) => void) | null>(null);

  // Inicializace mapy
  // biome-ignore lint/correctness/useExhaustiveDependencies: Mapa se má inicializovat pouze jednou při mountu
  useEffect(() => {
    if (!mapRef.current || map) return; // Prevent multiple initializations

    // Vrstva s markery
    const markersSource = new VectorSource();
    const markersLayer = new VectorLayer({
      source: markersSource,
    });
    markersLayerRef.current = markersLayer;

    // Vrstva s uživatelovou pozicí
    const userSource = new VectorSource();
    const userLayer = new VectorLayer({
      source: userSource,
    });
    userLayerRef.current = userLayer;

    // Vrstva s kružnicí přesnosti
    const accuracySource = new VectorSource();
    const accuracyLayer = new VectorLayer({
      source: accuracySource,
    });
    accuracyLayerRef.current = accuracyLayer;

    // Inicializace mapy
    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        accuracyLayer, // Kružnice přesnosti jako spodní vrstva
        markersLayer,
        userLayer, // Pozice uživatele navrchu
      ],
      view: new View({
        center: fromLonLat([center.longitude, center.latitude]),
        zoom: zoom,
      }),
    });

    setMap(initialMap);

    return () => {
      initialMap.setTarget(undefined);
      initialMap.dispose();
    };
  }, []); // Spustit jen jednou při mountu

  // Handle map click events
  useEffect(() => {
    if (!map) return;

    // Remove old handler if exists
    if (clickHandlerRef.current) {
      map.un("click", clickHandlerRef.current);
    }

    // Add new handler if onMapClick is provided
    if (onMapClick) {
      const handler = (event: any) => {
        const coords = toLonLat(event.coordinate);
        onMapClick({
          longitude: coords[0],
          latitude: coords[1],
        });
      };

      map.on("click", handler);
      clickHandlerRef.current = handler;
    }

    return () => {
      if (clickHandlerRef.current) {
        map.un("click", clickHandlerRef.current);
      }
    };
  }, [map, onMapClick]);

  // Aktualizace centra pouze při změně checkpointu (významná změna pozice)
  useEffect(() => {
    if (!map) return;
    const view = map.getView();
    const currentCenter = view.getCenter();
    const newCenter = fromLonLat([center.longitude, center.latitude]);

    // Vycentrovat mapu pouze pokud se centrum VÝZNAMNĚ změnilo
    // (více než ~100 metrů = pravděpodobně nový checkpoint)
    if (currentCenter) {
      const dx = Math.abs(currentCenter[0] - newCenter[0]);
      const dy = Math.abs(currentCenter[1] - newCenter[1]);
      // Skip small changes (< 100m) - uživatel si nazoomoval jinam a nechceme mu to zrušit
      if (dx < 10 && dy < 10) return;
    }

    // Významná změna centra = pravděpodobně nový checkpoint
    view.animate({
      center: newCenter,
      zoom: zoom,
      duration: 500,
    });
  }, [map, center.latitude, center.longitude, zoom]);

  // Aktualizace markerů
  useEffect(() => {
    if (!markersLayerRef.current) return;

    const source = markersLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    markers.forEach((marker) => {
      const feature = new Feature({
        geometry: new Point(
          fromLonLat([marker.location.longitude, marker.location.latitude]),
        ),
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
        geometry: new Point(
          fromLonLat([userLocation.longitude, userLocation.latitude]),
        ),
      });

      feature.setStyle(createMarkerStyle("user"));
      source.addFeature(feature);
    }
  }, [userLocation]);

  // Aktualizace kružnice přesnosti
  useEffect(() => {
    if (!accuracyLayerRef.current) return;

    const source = accuracyLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    if (userLocation && userAccuracy && userAccuracy > 0) {
      // Vytvoření kružnice s poloměrem podle GPS přesnosti
      const center = fromLonLat([
        userLocation.longitude,
        userLocation.latitude,
      ]);
      const circle = new CircleGeom(center, userAccuracy);

      const feature = new Feature({
        geometry: circle,
      });

      // Styl kružnice - průhledná zelená s okrajem
      feature.setStyle(
        new Style({
          fill: new Fill({
            color: "rgba(82, 183, 136, 0.15)", // Světle zelená s 15% opacity
          }),
          stroke: new Stroke({
            color: "rgba(82, 183, 136, 0.5)", // Zelená s 50% opacity
            width: 2,
          }),
        }),
      );

      source.addFeature(feature);
    }
  }, [userLocation, userAccuracy]);

  return (
    <Paper elevation={3} sx={{ overflow: "hidden", borderRadius: 2 }}>
      <Box ref={mapRef} sx={{ width: "100%", height }} />
    </Paper>
  );
}

// Helper funkce pro vytvoření stylu markeru
function createMarkerStyle(type: "checkpoint" | "user" | "target"): Style {
  if (type === "user") {
    return new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: "#52B788" }), // Svěží zelená z theme
        stroke: new Stroke({
          color: "#fff",
          width: 3,
        }),
      }),
    });
  }

  if (type === "target") {
    return new Style({
      image: new Circle({
        radius: 10,
        fill: new Fill({ color: "#E9C46A" }), // Písková žlutá z theme
        stroke: new Stroke({
          color: "#1B4332",
          width: 2,
        }),
      }),
    });
  }

  // checkpoint
  return new Style({
    image: new Circle({
      radius: 12,
      fill: new Fill({ color: "#2D6A4F" }), // Lesní zelená z theme
      stroke: new Stroke({
        color: "#fff",
        width: 3,
      }),
    }),
  });
}
