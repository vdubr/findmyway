// Hlavní herní stránka pro hráče

import {
  Flag as FlagIcon,
  LocationDisabled as LocationDisabledIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  Route as RouteIcon,
  SkipNext as SkipNextIcon,
  Star as StarIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogContent, Fab, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import foxTraveling from '../../../assets/fox/liska_na_cestach_sbatohem_a_buzolou.webp';
import { bottomSheetDialogSx } from '../../../components/bottomSheetSx';
import ErrorDisplay from '../../../components/ErrorDisplay';
import LoadingSpinner from '../../../components/LoadingSpinner';
import VictoryScreen from '../../../components/VictoryScreen';
import { useDeviceOrientation } from '../../../hooks/useDeviceOrientation';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { isAnonymousSessionId } from '../../../lib/anonymousSessions';
import {
  deletePlayerLocation,
  getCheckpointsByGameId,
  getGameById,
  startGameSession,
  updatePlayerLocation,
} from '../../../lib/api';
import { toUserMessage } from '../../../lib/errors';
import { LOCATION_UPDATE_INTERVAL } from '../../../utils/constants';
import { pluralCs } from '../../../utils/format';
import { calculateBearing, formatDistance, routeLength } from '../../../utils/geo';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import type { MapZoomRef } from '../../map/hooks/useMapZoom';
import CheckpointContentDialog from '../components/CheckpointContentDialog';
import DistanceIndicator from '../components/DistanceIndicator';
import { useGamePlayStore } from '../store/gamePlayStore';

// Dlaždice s údajem o hře v úvodním dialogu
function StartStat({
  icon,
  value,
  label,
  bg,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  bg: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: bg,
        borderRadius: '16px',
        py: 1.25,
        px: 0.5,
        textAlign: 'center',
        color: 'text.primary',
        '& svg': { color: 'primary.main' },
      }}
    >
      {icon}
      <Typography variant="h4" component="p" lineHeight={1.1}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

// Jak dlouho zůstane viditelné upozornění na nedostupný kompas (ms)
const COMPASS_ALERT_DURATION = 6000;

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
    session,
    initGame,
    updateUserPosition,
    completeCurrentCheckpoint,
    skipCheckpoint,
    showCheckpoint,
    hideCheckpoint,
    resetGame,
  } = useGamePlayStore();

  // isCancelled: odpověď, která dorazí po odchodu ze stránky (nebo po změně hry), se zahodí
  const loadGameData = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!gameId) return;

      try {
        setIsLoading(true);
        setError(null);

        const [gameData, checkpointsData] = await Promise.all([
          getGameById(gameId),
          getCheckpointsByGameId(gameId),
        ]);
        if (isCancelled()) return;

        if (checkpointsData.length === 0) {
          setError('Tato hra nemá žádné checkpointy.');
          return;
        }

        // Vrátí aktivní session, nebo založí novou
        const session = await startGameSession(gameId);
        if (isCancelled()) return;

        // Ulozit session id pro sdileni polohy
        setSessionId(session.id);

        initGame(gameData, checkpointsData, session);
      } catch (err) {
        if (isCancelled()) return;
        setError(toUserMessage(err, 'Chyba při načítání hry'));
      } finally {
        if (!isCancelled()) setIsLoading(false);
      }
    },
    [gameId, initGame]
  );

  // Load game data
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetGame je stabilní funkce ze store
  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;
    loadGameData(() => cancelled);

    return () => {
      cancelled = true;
      resetGame();
    };
  }, [gameId, loadGameData]);

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

  // Aktuální poloha a index v refech – efekt sdílení se kvůli nim nesmí restartovat
  // (restart = DELETE + UPSERT při každém GPS fixu)
  const positionRef = useRef(position);
  positionRef.current = position;
  const checkpointIndexRef = useRef(currentCheckpointIndex);
  checkpointIndexRef.current = currentCheckpointIndex;

  const shareRequired = game?.settings?.share_location_required ?? false;
  // Poloha jde uložit jen k DB session přihlášeného hráče (RLS + UUID sloupec)
  const isAnonymous = sessionId !== null && isAnonymousSessionId(sessionId);
  const hasPosition = position !== null;

  // Periodicky odesilat pozici hrace, pokud je sdileni vyzadovano
  useEffect(() => {
    if (
      !shareRequired ||
      !sessionId ||
      isAnonymous ||
      !gameStarted ||
      showVictory ||
      !hasPosition
    ) {
      return;
    }

    let cancelled = false;

    const sendLocation = async () => {
      const current = positionRef.current;
      if (cancelled || !current) return;
      try {
        await updatePlayerLocation(
          sessionId,
          current.latitude,
          current.longitude,
          current.accuracy ?? null,
          checkpointIndexRef.current
        );
      } catch (err) {
        console.warn('Chyba při odesílání pozice:', err);
      }
    };

    // Poslat pozici hned a pak v intervalu
    sendLocation();
    const intervalId = setInterval(sendLocation, LOCATION_UPDATE_INTERVAL);

    // Cleanup – při odchodu nebo konci hry smazat pozici a zrušit interval
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      deletePlayerLocation(sessionId).catch((err) => {
        console.warn('Chyba při mazání pozice:', err);
      });
    };
  }, [shareRequired, sessionId, isAnonymous, gameStarted, showVictory, hasPosition]);

  // Start hry: povolení kompasu a GPS
  const handleStartGame = () => {
    if (!gpsSupported) {
      setError('Váš prohlížeč nepodporuje geolokaci.');
      return;
    }

    // iOS povolí kompas jen přímo v obsluze kliknutí, proto jako první a bez čekání.
    // Chyby si hook zpracuje sám, hra může běžet i bez kompasu.
    if (orientationSupported) {
      void requestOrientationPermission();
    }

    setGameStarted(true);
    void requestPermission();
  };

  const handleCompleteCheckpoint = (checkpointId: string) => {
    completeCurrentCheckpoint(checkpointId);
  };

  const handleSkipCheckpoint = (checkpointId: string) => {
    skipCheckpoint(checkpointId);
  };

  const handleBackToHome = () => {
    navigate(gameId ? `/games/${gameId}` : '/games');
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
  };

  // Nedostupný kompas není kritický – upozornění samo zmizí, ať trvale nezakrývá mapu
  useEffect(() => {
    if (!orientationError) return;
    const timer = setTimeout(() => {
      setDismissedAlerts((prev) => new Set(prev).add('orientation-error'));
    }, COMPASS_ALERT_DURATION);
    return () => clearTimeout(timer);
  }, [orientationError]);

  // Zapnout/vypnout sledovani GPS pozice na mape (centrování řeší efekt níže)
  const handleToggleFollowGps = useCallback(() => {
    setFollowGps((prev) => !prev);
  }, []);

  // Ve follow režimu držet mapu vycentrovanou na hráči
  useEffect(() => {
    if (followGps && userPosition && mapRef.current) {
      mapRef.current.centerOnLocation({
        latitude: userPosition.latitude,
        longitude: userPosition.longitude,
      });
    }
  }, [followGps, userPosition]);

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

  // Vstupy mapy memoizované – MapComponent při každé nové referenci přestaví své vrstvy,
  // takže bez memo by je přestavoval každý render (např. při každé změně kompasu)
  const userLocation = useMemo(
    () =>
      userPosition ? { latitude: userPosition.latitude, longitude: userPosition.longitude } : null,
    [userPosition]
  );
  const targetLocation = useMemo(
    () =>
      currentCheckpoint
        ? { latitude: currentCheckpoint.latitude, longitude: currentCheckpoint.longitude }
        : null,
    [currentCheckpoint]
  );
  const showRadius = game?.settings.show_radius ?? true;

  const markers = useMemo<MapMarker[]>(() => {
    const result: MapMarker[] = [];
    if (userLocation) {
      result.push({ id: 'user', location: userLocation, type: 'user' });
    }
    if (currentCheckpoint && targetLocation) {
      result.push({
        id: currentCheckpoint.id,
        location: targetLocation,
        type: 'target',
        label: `${currentCheckpointIndex + 1}`,
        radius: showRadius ? currentCheckpoint.radius : undefined,
      });
    }
    return result;
  }, [userLocation, currentCheckpoint, targetLocation, currentCheckpointIndex, showRadius]);

  const routeLine = useMemo(
    () => (userLocation && targetLocation ? { from: userLocation, to: targetLocation } : null),
    [userLocation, targetLocation]
  );

  // Azimut k aktuálnímu checkpointu pro šipku v navigační polokouli
  const bearingToCheckpoint = useMemo(
    () => (userLocation && targetLocation ? calculateBearing(userLocation, targetLocation) : null),
    [userLocation, targetLocation]
  );

  // Statistiky pro vítěznou obrazovku
  const routeDistance = useMemo(() => routeLength(checkpoints), [checkpoints]);
  const sessionStart = session?.start_time;
  const victoryDurationMs = useMemo(() => {
    if (!showVictory || !sessionStart) return null;
    const started = Date.parse(sessionStart);
    return Number.isNaN(started) ? null : Date.now() - started;
  }, [showVictory, sessionStart]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} onRetry={() => loadGameData()} />;
  if (!game || !currentCheckpoint) return null;

  return (
    <Box
      sx={{
        height: {
          xs: 'calc(100dvh - 56px - env(safe-area-inset-top))',
          sm: 'calc(100dvh - 64px - env(safe-area-inset-top))',
        },
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Úvod před startem hry – na mobilu bottom sheet */}
      {!gameStarted && (
        <Dialog
          open={!gameStarted}
          maxWidth="sm"
          fullWidth
          sx={bottomSheetDialogSx}
          aria-labelledby="start-title"
        >
          <DialogContent sx={{ pt: 1.5, pb: 'calc(20px + env(safe-area-inset-bottom))' }}>
            <Stack spacing={2} alignItems="center">
              <Box
                aria-hidden
                sx={{ width: 44, height: 5, borderRadius: 999, bgcolor: '#CFE6D5' }}
              />
              <Box
                component="img"
                src={foxTraveling}
                alt="Liška s batohem a buzolou je připravená vyrazit"
                sx={{ width: 120, height: 120, objectFit: 'contain' }}
              />
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="overline"
                  sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: '0.08em' }}
                >
                  Připraven/a?
                </Typography>
                <Typography id="start-title" variant="h2" component="h2">
                  {game.title}
                </Typography>
                {game.description && (
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                    {game.description}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                <StartStat
                  icon={<FlagIcon />}
                  value={String(checkpoints.length)}
                  label={pluralCs(checkpoints.length, 'bod', 'body', 'bodů')}
                  bg="#E4F3E8"
                />
                <StartStat
                  icon={<StarIcon />}
                  value={`${game.difficulty}/5`}
                  label="obtížnost"
                  bg="#FFF4D1"
                />
                {routeDistance !== undefined && (
                  <StartStat
                    icon={<RouteIcon />}
                    value={formatDistance(routeDistance)}
                    label="trasa"
                    bg="#E4F3E8"
                  />
                )}
              </Stack>

              {game.settings.time_limit && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  <TimerIcon color="primary" />
                  <Typography variant="body2" fontWeight={600}>
                    Časový limit: {game.settings.time_limit} min
                  </Typography>
                </Stack>
              )}

              {/* Informace o sdílení polohy */}
              {shareRequired &&
                (isAnonymous ? (
                  <Alert severity="warning" sx={{ width: '100%', boxSizing: 'border-box' }}>
                    Tahle hra sdílí polohu s organizátorem. Funguje to jen po přihlášení – bez něj
                    tě organizátor na mapě neuvidí.
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{ width: '100%', boxSizing: 'border-box' }}>
                    Tahle hra sdílí tvoji polohu s organizátorem – uvidí tě na mapě v reálném čase.
                  </Alert>
                ))}

              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  width: '100%',
                  boxSizing: 'border-box',
                  bgcolor: 'info.light',
                  color: 'info.dark',
                  borderRadius: '16px',
                  px: 1.75,
                  py: 1.5,
                }}
              >
                <LocationIcon />
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  Povol prohlížeči polohu a kompas – liška tě pak navede přímo k bodům.
                </Typography>
              </Stack>

              {!gpsSupported && (
                <Alert severity="error" sx={{ width: '100%', boxSizing: 'border-box' }}>
                  Tvůj prohlížeč neumí určit polohu.
                </Alert>
              )}

              {gpsError && (
                <Alert severity="error" sx={{ width: '100%', boxSizing: 'border-box' }}>
                  {gpsError}
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={handleStartGame}
                disabled={!gpsSupported || gpsLoading}
                fullWidth
              >
                {gpsLoading ? 'Hledám, kde přesně jsi…' : 'Vyrazit!'}
              </Button>
              <Button variant="text" onClick={handleBackToHome}>
                Ještě ne
              </Button>
            </Stack>
          </DialogContent>
        </Dialog>
      )}

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
                    Hledám, kde přesně jsi… Nezapomeň prohlížeči povolit polohu.
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
                userLocation={userLocation}
                userAccuracy={position?.accuracy ?? null}
                userHeading={heading}
                markers={markers}
                routeLine={routeLine}
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
                aria-label={followGps ? 'Vypnout sledování polohy' : 'Sledovat polohu na mapě'}
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
              bearing={bearingToCheckpoint}
              heading={heading}
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
                Podívej se, co tu je
              </Button>
            )}

            {/* Skip waypoint button – jen pokud hra povoluje přeskakování */}
            {game.settings.allow_skip && !showCheckpointContent && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<SkipNextIcon />}
                onClick={() => handleSkipCheckpoint(currentCheckpoint.id)}
                fullWidth
                sx={{ mt: 1, bgcolor: 'background.paper' }}
              >
                Přeskočit bod
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

      {/* Vítězná obrazovka */}
      <VictoryScreen
        open={showVictory}
        gameTitle={game.title}
        completed={session?.metadata.checkpoints_completed.length ?? checkpoints.length}
        total={checkpoints.length}
        routeDistance={routeDistance}
        durationMs={victoryDurationMs}
        shareUrl={`${window.location.origin}/games/${game.id}`}
        primaryLabel="Zahrát další hru"
        onPrimary={() => navigate('/games')}
        secondaryLabel="Zpět na detail hry"
        onSecondary={handleBackToHome}
      />
    </Box>
  );
}
