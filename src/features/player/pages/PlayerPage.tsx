// Hlavní herní stránka pro hráče

import {
  LocationDisabled as LocationDisabledIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Fab,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import FoxGuide from '../../../components/FoxGuide';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useDeviceOrientation } from '../../../hooks/useDeviceOrientation';
import { useGeolocation } from '../../../hooks/useGeolocation';
import {
  deletePlayerLocation,
  getActiveSession,
  getCheckpointsByGameId,
  getGameById,
  startGameSession,
  updatePlayerLocation,
} from '../../../lib/api';
import { LOCATION_UPDATE_INTERVAL } from '../../../utils/constants';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import type { MapZoomRef } from '../../map/hooks/useMapZoom';
import CheckpointContentDialog from '../components/CheckpointContentDialog';
import DistanceIndicator from '../components/DistanceIndicator';
import { useGamePlayStore } from '../store/gamePlayStore';

export default function PlayerPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<MapZoomRef>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [followGps, setFollowGps] = useState(false); // Sledovani GPS pozice - centrovat mapu
  const hasFirstPositionRef = useRef(false); // Sledování první polohy pro auto-follow

  const {
    position,
    error: gpsError,
    loading: gpsLoading,
    isSupported: gpsSupported,
    requestPermission,
  } = useGeolocation();

  const {
    heading,
    error: orientationError,
    isSupported: orientationSupported,
    requestPermission: requestOrientationPermission,
  } = useDeviceOrientation();

  const {
    game,
    checkpoints,
    currentCheckpoint,
    currentCheckpointIndex,
    userPosition,
    distanceToCheckpoint,
    isInCheckpointRadius,
    checkpointReached,
    showCheckpointContent,
    showVictory,
    initGame,
    updateUserPosition,
    completeCurrentCheckpoint,
    skipCheckpoint,
    showCheckpoint,
    hideCheckpoint,
    resetGame,
  } = useGamePlayStore();

  // Load game data
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadGameData a resetGame jsou stabilní funkce
  useEffect(() => {
    if (!gameId) return;

    loadGameData();

    return () => {
      resetGame();
    };
  }, [gameId]);

  const loadGameData = async () => {
    if (!gameId) return;

    try {
      setIsLoading(true);
      setError(null);

      const gameData = await getGameById(gameId);
      const checkpointsData = await getCheckpointsByGameId(gameId);

      if (checkpointsData.length === 0) {
        setError('Tato hra nemá žádné checkpointy.');
        return;
      }

      // Check for active session or create new one
      let session = await getActiveSession(gameId);
      if (!session) {
        session = await startGameSession(gameId);
      }

      // Ulozit session id pro sdileni polohy
      setSessionId(session.id);

      initGame(gameData, checkpointsData, session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při načítání hry');
    } finally {
      setIsLoading(false);
    }
  };

  // Update user position in store + auto-follow na první fix
  // biome-ignore lint/correctness/useExhaustiveDependencies: updateUserPosition je stabilní funkce ze store
  useEffect(() => {
    if (position && gameStarted) {
      updateUserPosition(position);

      // Při první poloze automaticky centrovat mapu na uživatele
      if (!hasFirstPositionRef.current) {
        hasFirstPositionRef.current = true;
        setFollowGps(true);
      }
    }
  }, [position, gameStarted]);

  // Centrovat mapu na GPS pozici pokud je follow mode aktivni
  useEffect(() => {
    if (followGps && position && mapRef.current) {
      mapRef.current.centerOnLocation({
        latitude: position.latitude,
        longitude: position.longitude,
      });
    }
  }, [followGps, position]);

  // Periodicky odesilat pozici hrace, pokud je sdileni vyzadovano
  useEffect(() => {
    // Pokud neni vyzadovano sdileni, nebo neni session/pozice, nic nedelat
    const shareRequired = game?.settings?.share_location_required;
    if (!shareRequired || !sessionId || !position || !gameStarted) {
      return;
    }

    // Flag pro zruseni in-flight requestu pri re-runu efektu nebo unmountu
    let cancelled = false;

    // Funkce pro odeslani pozice
    const sendLocation = async () => {
      if (cancelled) return;
      try {
        await updatePlayerLocation(
          sessionId,
          position.latitude,
          position.longitude,
          position.accuracy ?? null,
          currentCheckpointIndex
        );
      } catch (err) {
        console.warn('Chyba pri odesilani pozice:', err);
      }
    };

    // Poslat pozici hned
    sendLocation();

    // Nastavit interval pro pravidelne odesilani
    const intervalId = setInterval(sendLocation, LOCATION_UPDATE_INTERVAL);

    // Cleanup - pri ukonceni smazat pozici a zrusit interval
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      // Smazat pozici pri odchodu (asynchronne, bez cekani)
      deletePlayerLocation(sessionId).catch((err) => {
        console.warn('Chyba pri mazani pozice:', err);
      });
    };
  }, [
    sessionId,
    position,
    gameStarted,
    currentCheckpointIndex,
    game?.settings?.share_location_required,
  ]);

  // Request GPS permission when starting game
  const handleStartGame = async () => {
    console.log('=== handleStartGame called ===');
    console.log('gpsSupported:', gpsSupported);
    console.log('gpsLoading:', gpsLoading);
    console.log('gpsError:', gpsError);

    if (!gpsSupported) {
      setError('Váš prohlížeč nepodporuje geolokaci.');
      return;
    }

    try {
      console.log('Setting gameStarted to true...');
      setGameStarted(true);
      console.log('Calling requestPermission...');
      await requestPermission();
      console.log('requestPermission completed');

      // Pokusit se získat i přístup k orientaci zařízení (kompas)
      if (orientationSupported) {
        try {
          console.log('Requesting device orientation permission...');
          await requestOrientationPermission();
          console.log('Device orientation permission granted');
        } catch (err) {
          console.warn('Device orientation permission denied:', err);
          // Není kritická chyba, hra může pokračovat bez kompasu
        }
      }
    } catch (err) {
      console.error('GPS permission error:', err);
      setError('Nepodařilo se získat přístup k poloze. Zkontrolujte nastavení prohlížeče.');
      setGameStarted(false);
    }
  };

  const handleCompleteCheckpoint = () => {
    completeCurrentCheckpoint();
    hideCheckpoint();
  };

  const handleSkipCheckpoint = () => {
    skipCheckpoint();
    hideCheckpoint();
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  // Zapnout/vypnout sledovani GPS pozice na mape
  // Čte pozici přímo ze store (getState) → callback je stabilní, nerekonstruuje se při každém GPS update
  const handleToggleFollowGps = useCallback(() => {
    setFollowGps((prev) => {
      const next = !prev;
      if (next && mapRef.current) {
        const pos = useGamePlayStore.getState().userPosition;
        if (pos) {
          mapRef.current.centerOnLocation({
            latitude: pos.latitude,
            longitude: pos.longitude,
          });
        }
      }
      return next;
    });
  }, []);

  // Deaktivace follow mode pri manualnim posunu mapy
  const handleMapMoveByUser = useCallback(() => {
    setFollowGps(false);
  }, []);

  // Zoom na aktualni checkpoint pri kliknuti na polokouli
  const handleNavigationClick = useCallback(() => {
    if (currentCheckpoint && mapRef.current) {
      mapRef.current.zoomToLocation({
        latitude: currentCheckpoint.latitude,
        longitude: currentCheckpoint.longitude,
      });
    }
  }, [currentCheckpoint]);

  // Prepare map markers
  const markers: MapMarker[] = [];

  // Add user position
  if (userPosition) {
    markers.push({
      id: 'user',
      location: {
        latitude: userPosition.latitude,
        longitude: userPosition.longitude,
      },
      type: 'user',
    });
  }

  // Add current checkpoint
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

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={loadGameData} />;
  if (!game || !currentCheckpoint) return null;

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Game not started - show intro */}
      {!gameStarted && (
        <Dialog open={!gameStarted} maxWidth="sm" fullWidth>
          <DialogTitle
            sx={{
              typography: 'h4',
              color: 'primary.main',
              textAlign: 'center',
            }}
          >
            {game.title}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} py={2}>
              {game.description && (
                <Typography variant="body1" textAlign="center">
                  {game.description}
                </Typography>
              )}

              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" color="primary">
                      Informace o hře:
                    </Typography>
                    <Typography variant="body2">
                      📍 Počet checkpointů: {checkpoints.length}
                    </Typography>
                    <Typography variant="body2">⭐ Obtížnost: {game.difficulty}/5</Typography>
                    {game.settings.time_limit && (
                      <Typography variant="body2">
                        ⏱️ Časový limit: {game.settings.time_limit} minut
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Informace o sdileni polohy */}
              {game.settings.share_location_required && (
                <Alert severity="info">
                  Tato hra vyzaduje sdileni vasi polohy s organizatorem hry. Vase pozice bude
                  zobrazena v realnem case.
                </Alert>
              )}

              {!gpsSupported && (
                <Alert severity="error">Váš prohlížeč nepodporuje geolokaci.</Alert>
              )}

              {gpsError && <Alert severity="error">{gpsError}</Alert>}

              <Button
                variant="contained"
                size="large"
                startIcon={<PlayIcon />}
                onClick={handleStartGame}
                disabled={!gpsSupported || gpsLoading}
                fullWidth
              >
                {gpsLoading ? 'Získávám polohu...' : 'Začít hru'}
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
      )}

      {/* Game started - show play interface */}
      {gameStarted && (
        <Box
          sx={{
            flex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Map - vyplní celou obrazovku */}
          <Box sx={{ flex: 1, px: 2, minHeight: 0, position: 'relative' }}>
            {/* Alerts overlay - absolutně pozicované nad mapou */}
            {((gpsLoading && !position && !dismissedAlerts.has('gps-loading')) ||
              (gpsError && !dismissedAlerts.has('gps-error')) ||
              (position && position.accuracy > 500 && !dismissedAlerts.has('low-accuracy')) ||
              (orientationError && !dismissedAlerts.has('orientation-error'))) && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  right: 8,
                  zIndex: 10,
                }}
              >
                {/* GPS Loading — rozlišujeme čekání na oprávnění vs. určování polohy */}
                {gpsLoading && !position && !dismissedAlerts.has('gps-loading') && (
                  <Alert
                    severity="info"
                    icon={<LocationIcon />}
                    sx={{
                      mb: 1,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      borderRadius: 3,
                    }}
                    onClose={() => dismissAlert('gps-loading')}
                  >
                    Určuji vaši polohu… Pokud jste ještě nepovolili přístup k poloze, prosím povolte
                    jej v prohlížeči.
                  </Alert>
                )}

                {/* Varování nízké přesnosti (IP lokace na desktopu) */}
                {position && position.accuracy > 500 && !dismissedAlerts.has('low-accuracy') && (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 1,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      borderRadius: 3,
                    }}
                    onClose={() => dismissAlert('low-accuracy')}
                  >
                    Přibližná poloha (~{Math.round(position.accuracy / 100) * 100} m). GPS není
                    dostupné — vzdálenosti a detekce checkpointů nemusí být přesné.
                  </Alert>
                )}

                {/* GPS Error */}
                {gpsError && !dismissedAlerts.has('gps-error') && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 1,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      borderRadius: 3,
                    }}
                    onClose={() => dismissAlert('gps-error')}
                  >
                    {gpsError}
                  </Alert>
                )}

                {/* Orientation Error - jen varování, ne kritická chyba */}
                {orientationError && !dismissedAlerts.has('orientation-error') && (
                  <Alert
                    severity="warning"
                    sx={{
                      fontSize: '0.875rem',
                      mb: 1,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      borderRadius: 3,
                    }}
                    onClose={() => dismissAlert('orientation-error')}
                  >
                    Kompas není dostupný: {orientationError}
                  </Alert>
                )}
              </Box>
            )}

            <Box sx={{ position: 'absolute', inset: 0 }}>
              <MapComponent
                ref={mapRef}
                center={{
                  latitude: currentCheckpoint.latitude,
                  longitude: currentCheckpoint.longitude,
                }}
                zoom={15}
                userLocation={
                  userPosition
                    ? {
                        latitude: userPosition.latitude,
                        longitude: userPosition.longitude,
                      }
                    : null
                }
                userAccuracy={position?.accuracy ?? null}
                userHeading={heading}
                markers={markers}
                routeLine={
                  userPosition && currentCheckpoint
                    ? {
                        from: {
                          latitude: userPosition.latitude,
                          longitude: userPosition.longitude,
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

              {/* Tlacitko pro sledovani GPS pozice */}
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

          {/* Distance indicator - fixed na spodku obrazovky */}
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              px: 2,
              pb: 2,
              zIndex: 100,
            }}
          >
            <DistanceIndicator
              distance={distanceToCheckpoint}
              isInRadius={isInCheckpointRadius}
              checkpointReached={checkpointReached}
              currentIndex={currentCheckpointIndex}
              totalCheckpoints={checkpoints.length}
              onNavigationClick={handleNavigationClick}
            />

            {/* Show checkpoint button */}
            {checkpointReached && !showCheckpointContent && (
              <Button
                variant="contained"
                size="large"
                startIcon={<LocationIcon />}
                onClick={showCheckpoint}
                fullWidth
                sx={{ mt: 1 }}
              >
                Zobrazit checkpoint
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Checkpoint content dialog */}
      {currentCheckpoint && (
        <CheckpointContentDialog
          open={showCheckpointContent}
          checkpoint={currentCheckpoint}
          checkpointIndex={currentCheckpointIndex}
          totalCheckpoints={checkpoints.length}
          onClose={hideCheckpoint}
          onComplete={handleCompleteCheckpoint}
          canSkip={game.settings.allow_skip}
          onSkip={handleSkipCheckpoint}
        />
      )}

      {/* Victory dialog */}
      <Dialog open={showVictory} maxWidth="sm" fullWidth>
        <DialogContent>
          <Stack spacing={3} alignItems="center" py={4}>
            {/* Liška našla poklad */}
            <Box sx={{ width: 200, height: 200, mb: 2 }}>
              <FoxGuide state="treasure" inline />
            </Box>
            <Typography variant="h3" color="primary" textAlign="center">
              Gratulujeme!
            </Typography>
            <Typography variant="h6" textAlign="center">
              Dokončili jste hru "{game.title}"
            </Typography>
            <Button variant="contained" size="large" onClick={handleBackToHome} fullWidth>
              Zpět na hlavní stránku
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
