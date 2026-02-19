// Hlavní herní stránka pro hráče

import { LocationOn as LocationIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import FoxGuide from '../../../components/FoxGuide';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useGeolocation } from '../../../hooks/useGeolocation';
import {
  getActiveSession,
  getCheckpointsByGameId,
  getGameById,
  startGameSession,
} from '../../../lib/api';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import CheckpointContentDialog from '../components/CheckpointContentDialog';
import DistanceIndicator from '../components/DistanceIndicator';
import { useGamePlayStore } from '../store/gamePlayStore';

export default function PlayerPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const {
    position,
    error: gpsError,
    loading: gpsLoading,
    isSupported: gpsSupported,
    requestPermission,
  } = useGeolocation();

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

      initGame(gameData, checkpointsData, session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při načítání hry');
    } finally {
      setIsLoading(false);
    }
  };

  // Update user position in store
  // biome-ignore lint/correctness/useExhaustiveDependencies: updateUserPosition je stabilní funkce ze store
  useEffect(() => {
    if (position && gameStarted) {
      updateUserPosition(position);
    }
  }, [position, gameStarted]);

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
    <Container
      maxWidth={false}
      disableGutters
      sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
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
        <Stack spacing={2} sx={{ flex: 1, p: 2, height: '100%' }}>
          {/* GPS Loading */}
          {gpsLoading && !position && (
            <Alert severity="info" icon={<LocationIcon />}>
              Čekám na přístup k poloze... Prosím povolte přístup k poloze v prohlížeči.
            </Alert>
          )}

          {/* GPS Error */}
          {gpsError && <Alert severity="error">{gpsError}</Alert>}

          {/* Distance indicator */}
          <DistanceIndicator
            distance={distanceToCheckpoint}
            isInRadius={isInCheckpointRadius}
            checkpointReached={checkpointReached}
            currentIndex={currentCheckpointIndex}
            totalCheckpoints={checkpoints.length}
          />

          {/* Map */}
          <MapComponent
            center={
              userPosition
                ? {
                    latitude: userPosition.latitude,
                    longitude: userPosition.longitude,
                  }
                : {
                    latitude: currentCheckpoint.latitude,
                    longitude: currentCheckpoint.longitude,
                  }
            }
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
            markers={markers}
            height="calc(100vh - 250px)"
          />

          {/* Show checkpoint button */}
          {checkpointReached && !showCheckpointContent && (
            <Button
              variant="contained"
              size="large"
              startIcon={<LocationIcon />}
              onClick={showCheckpoint}
              fullWidth
            >
              Zobrazit checkpoint
            </Button>
          )}

          {/* Checkpoint content dialog */}
          {currentCheckpoint && (
            <CheckpointContentDialog
              open={showCheckpointContent}
              checkpoint={currentCheckpoint}
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
        </Stack>
      )}
    </Container>
  );
}
