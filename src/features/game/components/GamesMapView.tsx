// Mapovy rezim zobrazeni dostupnych her
// Zobrazuje hry na mape s markery v tezisti checkpointu

import {
  Close as CloseIcon,
  LocationOn as LocationIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { Box, Button, Card, CardActions, CardContent, Chip, Typography } from '@mui/material';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OLMap from 'ol/Map';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import View from 'ol/View';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'ol/ol.css';
import type { Checkpoint, Game, GeoLocation } from '../../../types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../../utils/constants';
import { calculateCentroid } from '../../../utils/geo';

// Hra s checkpointy a vypoctenym teziskem
interface GameWithCentroid extends Game {
  checkpoints: Checkpoint[];
  centroid: GeoLocation | null;
}

interface GamesMapViewProps {
  games: (Game & { checkpoints: Checkpoint[] })[];
}

export default function GamesMapView({ games }: GamesMapViewProps) {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<OLMap | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameWithCentroid | null>(null);
  const markersLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const validGamesRef = useRef<GameWithCentroid[]>([]);

  // Vypocet teziště pro kazdu hru
  const gamesWithCentroids: GameWithCentroid[] = useMemo(() => {
    return games.map((game) => ({
      ...game,
      centroid: calculateCentroid(game.checkpoints),
    }));
  }, [games]);

  // Hry s validnim teziskem (maji alespon jeden checkpoint)
  const validGames = useMemo(() => {
    return gamesWithCentroids.filter((g) => g.centroid !== null);
  }, [gamesWithCentroids]);

  // Ref vždy ukazuje na aktuální seznam her (pro click handler v mapě)
  validGamesRef.current = validGames;

  // Inicializace mapy (záměrně jednou – guard `map` zabraňuje re-inicializaci)
  // biome-ignore lint/correctness/useExhaustiveDependencies: záměrně prázdné deps – mapa se inicializuje pouze jednou
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Vrstva s markery her
    const markersSource = new VectorSource();
    const markersLayer = new VectorLayer({
      source: markersSource,
    });
    markersLayerRef.current = markersLayer;

    // Vypocet vychoziho centra mapy - stred vsech her nebo default
    let initialCenter = DEFAULT_MAP_CENTER;
    if (validGames.length > 0) {
      const allCentroids = validGames.map((g) => g.centroid!);
      const mapCentroid = calculateCentroid(allCentroids);
      if (mapCentroid) {
        initialCenter = mapCentroid;
      }
    }

    const initialMap = new OLMap({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        markersLayer,
      ],
      view: new View({
        center: fromLonLat([initialCenter.longitude, initialCenter.latitude]),
        zoom: DEFAULT_MAP_ZOOM,
      }),
    });

    // Klik na marker
    initialMap.on('click', (event) => {
      const feature = initialMap.forEachFeatureAtPixel(event.pixel, (f) => f);
      if (feature) {
        const gameId = feature.get('gameId');
        const game = validGamesRef.current.find((g) => g.id === gameId);
        if (game) {
          setSelectedGame(game);
          // Vycentrovat na vybranou hru
          if (game.centroid) {
            initialMap.getView().animate({
              center: fromLonLat([game.centroid.longitude, game.centroid.latitude]),
              zoom: 14,
              duration: 500,
            });
          }
        }
      }
    });

    // Zmena kurzoru nad markery
    initialMap.on('pointermove', (event) => {
      const hit = initialMap.hasFeatureAtPixel(event.pixel);
      initialMap.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    setMap(initialMap);

    return () => {
      initialMap.setTarget(undefined);
      initialMap.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aktualizace markeru pri zmene her
  useEffect(() => {
    if (!markersLayerRef.current) return;

    const source = markersLayerRef.current.getSource();
    if (!source) return;

    source.clear();

    validGames.forEach((game) => {
      if (!game.centroid) return;

      const feature = new Feature({
        geometry: new Point(fromLonLat([game.centroid.longitude, game.centroid.latitude])),
        gameId: game.id,
        gameTitle: game.title,
      });

      // Styl markeru
      feature.setStyle(
        new Style({
          image: new Circle({
            radius: 16,
            fill: new Fill({ color: '#2D6A4F' }),
            stroke: new Stroke({
              color: '#fff',
              width: 3,
            }),
          }),
          text: new Text({
            text: game.checkpoints.length.toString(),
            fill: new Fill({ color: '#fff' }),
            font: 'bold 12px sans-serif',
          }),
        })
      );

      source.addFeature(feature);
    });

    // Fit view na vsechny markery pokud jsou
    if (validGames.length > 0 && map) {
      const extent = source.getExtent();
      if (extent && extent[0] !== Infinity) {
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 14,
          duration: 500,
        });
      }
    }
  }, [validGames, map]);

  return (
    <Box sx={{ position: 'relative', height: '60vh', minHeight: 400 }}>
      {/* Mapa */}
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      />

      {/* Info karta vybrane hry */}
      {selectedGame && (
        <Card
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            maxWidth: 400,
            mx: 'auto',
            zIndex: 1000,
          }}
        >
          <CardContent sx={{ pb: 1 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <Typography variant="h6" color="primary">
                {selectedGame.title}
              </Typography>
              <Button
                size="small"
                onClick={() => setSelectedGame(null)}
                sx={{ minWidth: 'auto', p: 0.5 }}
              >
                <CloseIcon fontSize="small" />
              </Button>
            </Box>

            {selectedGame.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedGame.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<LocationIcon />}
                label={`${selectedGame.checkpoints.length} checkpointu`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Obtiznost: ${'*'.repeat(selectedGame.difficulty)}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </CardContent>

          <CardActions>
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={() => navigate(`/play/${selectedGame.id}`)}
              fullWidth
            >
              Hrat
            </Button>
          </CardActions>
        </Card>
      )}

      {/* Info pokud nejsou zadne hry na mape */}
      {validGames.length === 0 && games.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            p: 2,
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography color="text.secondary">Zadna hra nema definovane checkpointy</Typography>
        </Box>
      )}
    </Box>
  );
}
