// Demo mod - simulace hrani hry z pohledu hrace
// Admin vidi stejne UI jako hrac, ale misto GPS priblizeni pouziva tlacitko "Najit dalsi"

import {
  LocationDisabled as LocationDisabledIcon,
  MyLocation as MyLocationIcon,
  PlayArrow as PlayIcon,
  SkipNext as SkipNextIcon,
} from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogContent, Fab, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import FoxGuide from '../../../components/FoxGuide';
import { useDeviceOrientation } from '../../../hooks/useDeviceOrientation';
import { useGeolocation } from '../../../hooks/useGeolocation';
import type { Checkpoint, Game } from '../../../types';
import { calculateDistance } from '../../../utils/geo';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import type { MapZoomRef } from '../../map/hooks/useMapZoom';
import CheckpointContentDialog from '../../player/components/CheckpointContentDialog';
import DistanceIndicator from '../../player/components/DistanceIndicator';
import type { TempCheckpoint } from '../store/gameEditorStore';

interface DemoPlayerProps {
  game: Game;
  tempCheckpoints: TempCheckpoint[];
  onExit: () => void;
}

// Prevod TempCheckpoint na Checkpoint pro pouziti v hracskych komponentach
function toCheckpoint(tc: TempCheckpoint, gameId: string): Checkpoint {
  const now = new Date().toISOString();
  return {
    id: tc.id || tc.tempId,
    game_id: gameId,
    order_index: tc.order_index,
    latitude: tc.latitude,
    longitude: tc.longitude,
    radius: tc.radius,
    type: tc.type,
    content: tc.content,
    secret_solution: tc.secret_solution,
    is_fake: tc.is_fake,
    created_at: now,
    updated_at: now,
  };
}

export default function DemoPlayer({ game, tempCheckpoints, onExit }: DemoPlayerProps) {
  const mapRef = useRef<MapZoomRef>(null);

  const [demoStarted, setDemoStarted] = useState(false);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);
  const [checkpointReached, setCheckpointReached] = useState(false);
  const [showCheckpointContent, setShowCheckpointContent] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [followGps, setFollowGps] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const {
    position,
    error: gpsError,
    loading: gpsLoading,
    isSupported: gpsSupported,
    requestPermission,
  } = useGeolocation();

  const {
    heading,
    isSupported: orientationSupported,
    requestPermission: requestOrientationPermission,
  } = useDeviceOrientation();

  // Prevest tempCheckpoints na Checkpoint[] (serazene)
  const checkpoints: Checkpoint[] = [...tempCheckpoints]
    .sort((a, b) => a.order_index - b.order_index)
    .map((tc) => toCheckpoint(tc, game.id || 'demo'));

  const currentCheckpoint = checkpoints[currentCheckpointIndex] || null;

  // Vzdalenost k aktualnimu checkpointu
  const distanceToCheckpoint =
    position && currentCheckpoint
      ? calculateDistance(
          { latitude: position.latitude, longitude: position.longitude },
          { latitude: currentCheckpoint.latitude, longitude: currentCheckpoint.longitude }
        )
      : null;

  // Zda jsme v radiusu checkpointu
  const totalRadius = currentCheckpoint
    ? currentCheckpoint.radius + (game.settings.radius_tolerance || 10)
    : 0;
  const isInCheckpointRadius = distanceToCheckpoint !== null && distanceToCheckpoint <= totalRadius;

  // Spustit demo - zacina s tlacitkem "Objevit checkpoint 1"
  const handleStartDemo = async () => {
    setDemoStarted(true);

    if (gpsSupported) {
      try {
        await requestPermission();
        if (orientationSupported) {
          try {
            await requestOrientationPermission();
          } catch {
            // Kompas neni kriticky
          }
        }
      } catch {
        // GPS chyba - demo muze pokracovat i bez GPS
      }
    }
  };

  // Simulovat dosazeni checkpointu - tlacitko "Najit dalsi"
  const handleSimulateReach = useCallback(() => {
    if (!currentCheckpoint) return;
    setCheckpointReached(true);
    setShowCheckpointContent(true);
  }, [currentCheckpoint]);

  // Dokoncit checkpoint a prejit na dalsi
  const handleCompleteCheckpoint = useCallback(() => {
    const nextIndex = currentCheckpointIndex + 1;
    if (nextIndex >= checkpoints.length) {
      setShowVictory(true);
      setShowCheckpointContent(false);
    } else {
      setCurrentCheckpointIndex(nextIndex);
      setCheckpointReached(false);
      setShowCheckpointContent(false);
    }
  }, [currentCheckpointIndex, checkpoints.length]);

  // Preskocit checkpoint
  const handleSkipCheckpoint = useCallback(() => {
    handleCompleteCheckpoint();
  }, [handleCompleteCheckpoint]);

  // Follow GPS
  const handleToggleFollowGps = useCallback(() => {
    setFollowGps((prev) => {
      const next = !prev;
      if (next && position && mapRef.current) {
        mapRef.current.centerOnLocation({
          latitude: position.latitude,
          longitude: position.longitude,
        });
      }
      return next;
    });
  }, [position]);

  const handleMapMoveByUser = useCallback(() => {
    setFollowGps(false);
  }, []);

  // Centrovat mapu na GPS pozici pokud je follow mode aktivni
  // biome-ignore lint/correctness/useExhaustiveDependencies: mapRef je stabilni ref
  useEffect(() => {
    if (followGps && position && mapRef.current) {
      mapRef.current.centerOnLocation({
        latitude: position.latitude,
        longitude: position.longitude,
      });
    }
  }, [followGps, position]);

  // Zoom na checkpoint
  const handleNavigationClick = useCallback(() => {
    if (currentCheckpoint && mapRef.current) {
      mapRef.current.zoomToLocation({
        latitude: currentCheckpoint.latitude,
        longitude: currentCheckpoint.longitude,
      });
    }
  }, [currentCheckpoint]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  // Markery na mape
  const markers: MapMarker[] = [];

  if (position && demoStarted) {
    markers.push({
      id: 'user',
      location: {
        latitude: position.latitude,
        longitude: position.longitude,
      },
      type: 'user',
    });
  }

  if (currentCheckpoint) {
    markers.push({
      id: currentCheckpoint.id,
      location: {
        latitude: currentCheckpoint.latitude,
        longitude: currentCheckpoint.longitude,
      },
      type: 'target',
      label: `${currentCheckpointIndex + 1}`,
    });
  }

  // Pokud neni zadny checkpoint, zobrazit varovani
  if (checkpoints.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Hra nema zadne checkpointy. Pridejte checkpointy v editoru mapy.
        </Alert>
        <Button variant="outlined" onClick={onExit}>
          Zpet
        </Button>
      </Box>
    );
  }

  // Startovaci obrazovka
  if (!demoStarted) {
    return (
      <Box sx={{ py: 4, maxWidth: 500, mx: 'auto' }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h5" color="primary" textAlign="center">
            Demo: {game.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Simulace hry z pohledu hrace. Zacnete na sve pozici a postupne prochazte checkpointy.
          </Typography>
          <Alert severity="info">
            Tlacitkem "Objevit checkpoint" simulujete dosazeni checkpointu bez nutnosti fyzicke
            pritomnosti.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Pocet checkpointu: {checkpoints.length}
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayIcon />}
            onClick={handleStartDemo}
            fullWidth
          >
            Spustit demo
          </Button>
          <Button variant="outlined" onClick={onExit} fullWidth>
            Zpet
          </Button>
        </Stack>
      </Box>
    );
  }

  // Herni rozhrani
  return (
    <Box
      sx={{
        height: 'calc(100vh - 200px)',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Mapa */}
      <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Alerts */}
        {gpsError && !dismissedAlerts.has('gps-error') && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              zIndex: 10,
            }}
          >
            <Alert
              severity="warning"
              sx={{
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                borderRadius: 3,
              }}
              onClose={() => dismissAlert('gps-error')}
            >
              GPS: {gpsError} (demo pokracuje bez GPS)
            </Alert>
          </Box>
        )}

        {/* GPS loading */}
        {gpsLoading && !position && !dismissedAlerts.has('gps-loading') && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              zIndex: 10,
            }}
          >
            <Alert
              severity="info"
              sx={{
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                borderRadius: 3,
              }}
              onClose={() => dismissAlert('gps-loading')}
            >
              Cekam na GPS pozici...
            </Alert>
          </Box>
        )}

        <Box sx={{ position: 'absolute', inset: 0 }}>
          <MapComponent
            ref={mapRef}
            center={
              currentCheckpoint
                ? {
                    latitude: currentCheckpoint.latitude,
                    longitude: currentCheckpoint.longitude,
                  }
                : undefined
            }
            zoom={15}
            userLocation={
              position
                ? {
                    latitude: position.latitude,
                    longitude: position.longitude,
                  }
                : null
            }
            userAccuracy={position?.accuracy ?? null}
            userHeading={heading}
            markers={markers}
            routeLine={
              position && currentCheckpoint
                ? {
                    from: {
                      latitude: position.latitude,
                      longitude: position.longitude,
                    },
                    to: {
                      latitude: currentCheckpoint.latitude,
                      longitude: currentCheckpoint.longitude,
                    },
                  }
                : null
            }
            onMoveByUser={handleMapMoveByUser}
            height="100%"
          />

          {/* GPS follow tlacitko */}
          <Fab
            size="small"
            onClick={handleToggleFollowGps}
            sx={{
              position: 'absolute',
              top: 80,
              right: 16,
              zIndex: 10,
              bgcolor: followGps ? 'primary.main' : 'background.paper',
              color: followGps ? 'white' : 'text.secondary',
              '&:hover': {
                bgcolor: followGps ? 'primary.dark' : 'grey.200',
              },
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            aria-label={followGps ? 'Vypnout sledovani polohy' : 'Sledovat polohu na mape'}
          >
            {followGps ? <MyLocationIcon /> : <LocationDisabledIcon />}
          </Fab>
        </Box>
      </Box>

      {/* Ovladaci prvky - dole */}
      <Box sx={{ px: 2, pb: 2, pt: 1 }}>
        <DistanceIndicator
          distance={distanceToCheckpoint}
          isInRadius={isInCheckpointRadius}
          checkpointReached={checkpointReached}
          currentIndex={currentCheckpointIndex}
          totalCheckpoints={checkpoints.length}
          onNavigationClick={handleNavigationClick}
        />

        {/* Tlacitko "Objevit checkpoint X" - simulace dosazeni checkpointu */}
        {!checkpointReached && !showVictory && (
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleSimulateReach}
            startIcon={<SkipNextIcon />}
            fullWidth
            sx={{ mt: 1 }}
          >
            Objevit checkpoint {currentCheckpointIndex + 1}
          </Button>
        )}

        {/* Zobrazit checkpoint tlacitko (pokud uz byl dosazen ale dialog zavren) */}
        {checkpointReached && !showCheckpointContent && !showVictory && (
          <Button
            variant="contained"
            size="large"
            onClick={() => setShowCheckpointContent(true)}
            fullWidth
            sx={{ mt: 1 }}
          >
            Zobrazit checkpoint
          </Button>
        )}
      </Box>

      {/* Checkpoint content dialog - v demo modu vzdy povolime skip */}
      {currentCheckpoint && (
        <CheckpointContentDialog
          open={showCheckpointContent}
          checkpoint={currentCheckpoint}
          checkpointIndex={currentCheckpointIndex}
          totalCheckpoints={checkpoints.length}
          onClose={() => setShowCheckpointContent(false)}
          onComplete={handleCompleteCheckpoint}
          canSkip
          onSkip={handleSkipCheckpoint}
        />
      )}

      {/* Victory dialog */}
      <Dialog open={showVictory} maxWidth="sm" fullWidth>
        <DialogContent>
          <Stack spacing={3} alignItems="center" py={4}>
            <Box sx={{ width: 200, height: 200, mb: 2 }}>
              <FoxGuide state="treasure" inline />
            </Box>
            <Typography variant="h3" color="primary" textAlign="center">
              Gratulujeme!
            </Typography>
            <Typography variant="h6" textAlign="center">
              Dokoncili jste demo hry "{game.title}"
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Toto je nahled toho, co uvidi hrac po dokonceni vsech checkpointu.
            </Typography>
            <Button variant="contained" size="large" onClick={onExit} fullWidth>
              Zpet do editace
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
