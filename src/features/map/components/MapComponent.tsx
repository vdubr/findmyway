import { Box, Paper } from '@mui/material';
import { Feature } from 'ol';
import { Circle as CircleGeom, LineString, Point } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OLMap from 'ol/Map';
import { fromLonLat, toLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Icon, Stroke, Style, Text } from 'ol/style';
import View from 'ol/View';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import 'ol/ol.css';
import type { GeoLocation } from '../../../types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_SIGNIFICANT_MOVE_THRESHOLD,
} from '../../../utils/constants';
import type { MapZoomRef } from '../hooks/useMapZoom';

// Typ pro click event handler mapy
// biome-ignore lint/suspicious/noExplicitAny: OpenLayers má komplexní typování event handlerů
type MapEventHandler = (event: any) => void;

interface MapComponentProps {
  center?: GeoLocation;
  zoom?: number;
  userLocation?: GeoLocation | null;
  userAccuracy?: number | null; // GPS přesnost v metrech
  userHeading?: number | null; // Azimut (směr) v stupních (0-360)
  markers?: MapMarker[];
  routeLine?: { from: GeoLocation; to: GeoLocation } | null; // Cara mezi dvema body (napr. hrac -> checkpoint)
  onMapClick?: (location: GeoLocation) => void;
  onMoveByUser?: () => void; // Callback pri manualnim posunu mapy uzivatelem (drag/pinch)
  height?: string | number;
}

export interface MapMarker {
  id: string;
  location: GeoLocation;
  type: 'checkpoint' | 'user' | 'target' | 'player';
  label?: string;
  radius?: number; // Radius v metrech pro zobrazeni kruznice kolem markeru
  tooltip?: string; // Tooltip pro zobrazení nad markerem (pouziva se pro hrače)
}

const MapComponent = forwardRef<MapZoomRef, MapComponentProps>(function MapComponent(
  {
    center = DEFAULT_MAP_CENTER,
    zoom = DEFAULT_MAP_ZOOM,
    userLocation,
    userAccuracy,
    userHeading,
    markers = [],
    routeLine,
    onMapClick,
    onMoveByUser,
    height = '500px',
  },
  ref
) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<OLMap | null>(null);

  // Ref pro rozliseni programatickeho posunu od manualniho
  const isProgrammaticMoveRef = useRef(false);
  const onMoveByUserRef = useRef(onMoveByUser);
  onMoveByUserRef.current = onMoveByUser;

  // Imperativní API pro zoom na lokaci
  useImperativeHandle(
    ref,
    () => ({
      zoomToLocation: (location: GeoLocation, zoomLevel: number = 17) => {
        if (map) {
          isProgrammaticMoveRef.current = true;
          map.getView().animate(
            {
              center: fromLonLat([location.longitude, location.latitude]),
              zoom: zoomLevel,
              duration: 500,
            },
            () => {
              isProgrammaticMoveRef.current = false;
            }
          );
        }
      },
      // Centrovat mapu na pozici bez zmeny zoomu (pro follow mode)
      centerOnLocation: (location: GeoLocation) => {
        if (map) {
          isProgrammaticMoveRef.current = true;
          map.getView().animate(
            {
              center: fromLonLat([location.longitude, location.latitude]),
              duration: 300,
            },
            () => {
              isProgrammaticMoveRef.current = false;
            }
          );
        }
      },
    }),
    [map]
  );
  const markersLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const accuracyLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const routeLineLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const clickHandlerRef = useRef<MapEventHandler | null>(null);
  // Ref místo state-guard — bezpečné i v React Strict Mode (double-invoke)
  const mapInitializedRef = useRef(false);

  // Inicializace mapy
  // biome-ignore lint/correctness/useExhaustiveDependencies: Mapa se má inicializovat pouze jednou při mountu
  useEffect(() => {
    if (!mapRef.current || mapInitializedRef.current) return;
    mapInitializedRef.current = true;

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

    // Vrstva s carou mezi hracem a checkpointem
    const routeLineSource = new VectorSource();
    const routeLineLayer = new VectorLayer({
      source: routeLineSource,
    });
    routeLineLayerRef.current = routeLineLayer;

    // Inicializace mapy
    const initialMap = new OLMap({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        accuracyLayer, // Kružnice přesnosti jako spodní vrstva
        routeLineLayer, // Cara mezi hracem a checkpointem
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
      mapInitializedRef.current = false;
      setMap(null); // Vyčistit stale referenci před dalším mountem
      initialMap.setTarget(undefined);
      initialMap.dispose();
    };
  }, []); // Spustit jen jednou při mountu

  // Detekce manualniho posunu mapy uzivatelem (drag/touch)
  useEffect(() => {
    if (!map) return;

    const handlePointerDrag = () => {
      if (!isProgrammaticMoveRef.current && onMoveByUserRef.current) {
        onMoveByUserRef.current();
      }
    };

    map.on('pointerdrag', handlePointerDrag);

    return () => {
      map.un('pointerdrag', handlePointerDrag);
    };
  }, [map]);

  // Handle map click events
  useEffect(() => {
    if (!map) return;

    // Remove old handler if exists
    if (clickHandlerRef.current) {
      map.un('click' as const, clickHandlerRef.current);
    }

    // Add new handler if onMapClick is provided
    if (onMapClick) {
      const handler: MapEventHandler = (event) => {
        const coords = toLonLat(event.coordinate);
        onMapClick({
          longitude: coords[0],
          latitude: coords[1],
        });
      };

      map.on('click' as const, handler);
      clickHandlerRef.current = handler;
    }

    return () => {
      if (clickHandlerRef.current) {
        map.un('click' as const, clickHandlerRef.current);
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
      if (dx < MAP_SIGNIFICANT_MOVE_THRESHOLD && dy < MAP_SIGNIFICANT_MOVE_THRESHOLD) return;
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
        geometry: new Point(fromLonLat([marker.location.longitude, marker.location.latitude])),
        markerType: marker.type,
        markerId: marker.id,
        markerLabel: marker.label,
      });

      feature.setStyle(createMarkerStyle(marker.type, undefined, marker.label));
      source.addFeature(feature);

      // Kruznice zobrazujici radius checkpointu
      if (marker.radius && marker.radius > 0) {
        const radiusPolygon = circular(
          [marker.location.longitude, marker.location.latitude],
          marker.radius,
          64
        );
        radiusPolygon.transform('EPSG:4326', 'EPSG:3857');

        const radiusFeature = new Feature({
          geometry: radiusPolygon,
        });
        radiusFeature.setStyle(
          new Style({
            stroke: new Stroke({
              color: 'rgba(45, 106, 79, 0.6)', // Lesni zelena, pruhledna
              width: 2,
              lineDash: [6, 4],
            }),
            fill: new Fill({
              color: 'rgba(45, 106, 79, 0.08)', // Jemne zelene vyplneni
            }),
          })
        );
        source.addFeature(radiusFeature);
      }
    });
  }, [markers]);

  // Aktualizace uživatelovy pozice a směru
  useEffect(() => {
    if (!userLayerRef.current) return;

    const source = userLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    if (userLocation) {
      const feature = new Feature({
        geometry: new Point(fromLonLat([userLocation.longitude, userLocation.latitude])),
      });

      // Pokud máme heading, zobrazit šipku, jinak kruh
      feature.setStyle(createMarkerStyle('user', userHeading ?? undefined));
      source.addFeature(feature);
    }
  }, [userLocation, userHeading]);

  // Aktualizace kružnice přesnosti
  useEffect(() => {
    if (!accuracyLayerRef.current) return;

    const source = accuracyLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    if (userLocation && userAccuracy && userAccuracy > 0) {
      // Vytvoření kružnice s poloměrem podle GPS přesnosti
      const center = fromLonLat([userLocation.longitude, userLocation.latitude]);
      const circle = new CircleGeom(center, userAccuracy);

      const feature = new Feature({
        geometry: circle,
      });

      // Styl kružnice - průhledná zelená s okrajem
      feature.setStyle(
        new Style({
          fill: new Fill({
            color: 'rgba(82, 183, 136, 0.15)', // Světle zelená s 15% opacity
          }),
          stroke: new Stroke({
            color: 'rgba(82, 183, 136, 0.5)', // Zelená s 50% opacity
            width: 2,
          }),
        })
      );

      source.addFeature(feature);
    }
  }, [userLocation, userAccuracy]);

  // Aktualizace cary mezi hracem a checkpointem
  useEffect(() => {
    if (!routeLineLayerRef.current) return;

    const source = routeLineLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    if (routeLine) {
      const fromCoord = fromLonLat([routeLine.from.longitude, routeLine.from.latitude]);
      const toCoord = fromLonLat([routeLine.to.longitude, routeLine.to.latitude]);

      const feature = new Feature({
        geometry: new LineString([fromCoord, toCoord]),
      });

      // Tenka carkovana cara - tlumena zelena
      feature.setStyle(
        new Style({
          stroke: new Stroke({
            color: 'rgba(45, 106, 79, 0.4)', // Lesni zelena, hodne pruhledna
            width: 2,
            lineDash: [8, 6],
          }),
        })
      );

      source.addFeature(feature);
    }
  }, [routeLine]);

  return (
    <Paper
      elevation={3}
      sx={{
        overflow: 'hidden',
        borderRadius: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box ref={mapRef} sx={{ width: '100%', height }} />
    </Paper>
  );
});

export default MapComponent;

// Helper funkce pro vytvoření stylu markeru
function createMarkerStyle(
  type: 'checkpoint' | 'user' | 'target' | 'player',
  heading?: number,
  label?: string
): Style {
  if (type === 'user') {
    // Pokud máme heading, zobrazit šipku směřující daným směrem
    if (heading !== undefined && heading !== null) {
      // Vytvořit canvas se šipkou
      const canvas = document.createElement('canvas');
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.clearRect(0, 0, size, size);

        // Posunout origin do středu
        ctx.translate(size / 2, size / 2);

        // Rotovat podle heading (převést stupně na radiány)
        // OpenLayers používá radiány, heading je ve stupních
        ctx.rotate((heading * Math.PI) / 180);

        // Nakreslit šipku směřující nahoru (po rotaci bude směřovat podle heading)
        ctx.beginPath();
        ctx.moveTo(0, -12); // Špička šipky
        ctx.lineTo(-8, 8); // Levý roh
        ctx.lineTo(0, 4); // Střed dolního okraje
        ctx.lineTo(8, 8); // Pravý roh
        ctx.closePath();

        // Vyplnit zelenou
        ctx.fillStyle = '#52B788';
        ctx.fill();

        // Bílý okraj
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      return new Style({
        image: new Icon({
          img: canvas,
          size: [size, size],
          rotation: 0, // Rotace je už v canvasu
        }),
      });
    }

    // Bez heading zobrazit klasický kruh
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
      text: label
        ? new Text({
            text: label,
            fill: new Fill({ color: '#1B4332' }),
            font: 'bold 11px sans-serif',
            offsetY: 1,
          })
        : undefined,
    });
  }

  // Styl pro aktivniho hrace (modry kruh)
  if (type === 'player') {
    return new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color: '#3B82F6' }), // Modra
        stroke: new Stroke({
          color: '#fff',
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
    text: label
      ? new Text({
          text: label,
          fill: new Fill({ color: '#fff' }),
          font: 'bold 12px sans-serif',
          offsetY: 1, // Mírný posun dolů pro optické vycentrování
        })
      : undefined,
  });
}
