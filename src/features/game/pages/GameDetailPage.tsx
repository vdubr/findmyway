// Detail hry – popis, mapa checkpointů, info o tvůrci, tlačítka Hrát/Editovat

import {
  Edit as EditIcon,
  Flag as FlagIcon,
  PlayArrow as PlayIcon,
  Route as RouteIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DifficultyIcon from '../../../components/DifficultyIcon';
import ErrorDisplay from '../../../components/ErrorDisplay';
import { difficultyChipSx, routeChipSx, tagChipSx } from '../../../components/gameChipStyles';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { getGameById } from '../../../lib/api';
import { toUserMessage } from '../../../lib/errors';
import type { GameDetail } from '../../../types';
import { GAME_TAGS } from '../../../utils/constants';
import { pluralCs } from '../../../utils/format';
import { calculateDistance, formatDistance } from '../../../utils/geo';
import { useAuth } from '../../auth/AuthContext';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import { useGameDetailStore } from '../store/gameDetailStore';

// Typ pro hru s tvůrcem a checkpointy

export default function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Hláška z editoru po uložení (editor se po uložení odmountuje, jeho Snackbar by zmizel)
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage;
  const clearSuccessMessage = () => navigate(location.pathname, { replace: true, state: null });
  const { user } = useAuth();
  const setDetailGame = useGameDetailStore((s) => s.setGame);

  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllWaypoints, setShowAllWaypoints] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getGameById(gameId);
        setGame(data);
        setDetailGame(data);
      } catch (err) {
        setError(toUserMessage(err, 'Nepodařilo se načíst hru'));
      } finally {
        setLoading(false);
      }
    };

    load();

    // Vyčistit breadcrumb při odchodu
    return () => setDetailGame(null);
  }, [gameId, setDetailGame]);

  // Seřazené checkpointy podle order_index
  const sortedCheckpoints = useMemo(() => {
    if (!game?.checkpoints) return [];
    return [...game.checkpoints].sort((a, b) => a.order_index - b.order_index);
  }, [game]);

  // Celková délka trasy
  const routeDistance = useMemo(() => {
    if (sortedCheckpoints.length < 2) return undefined;
    return sortedCheckpoints.reduce(
      (sum, cp, i) => (i === 0 ? 0 : sum + calculateDistance(sortedCheckpoints[i - 1], cp)),
      0
    );
  }, [sortedCheckpoints]);

  // Markery checkpointů pro mapu – defaultně jen první
  const markers = useMemo<MapMarker[]>(() => {
    const visible = showAllWaypoints ? sortedCheckpoints : sortedCheckpoints.slice(0, 1);
    return visible.map((cp, i) => ({
      id: cp.id ?? String(i),
      location: { latitude: cp.latitude, longitude: cp.longitude },
      type: 'checkpoint' as const,
      label: showAllWaypoints ? String(sortedCheckpoints.indexOf(cp) + 1) : '1',
    }));
  }, [sortedCheckpoints, showAllWaypoints]);

  // Střed mapy = první checkpoint (nebo centroid při zobrazení všech)
  const mapCenter = useMemo(() => {
    if (!sortedCheckpoints.length) return undefined;
    if (!showAllWaypoints) {
      return { latitude: sortedCheckpoints[0].latitude, longitude: sortedCheckpoints[0].longitude };
    }
    const lats = sortedCheckpoints.map((cp) => cp.latitude);
    const lons = sortedCheckpoints.map((cp) => cp.longitude);
    return {
      latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
      longitude: lons.reduce((a, b) => a + b, 0) / lons.length,
    };
  }, [sortedCheckpoints, showAllWaypoints]);

  const isCreator = user && game && user.id === game.creator_id;

  if (loading) return <LoadingSpinner />;
  if (error || !game) return <ErrorDisplay message={error ?? 'Hra nenalezena'} />;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={3}>
        {/* Název a akční tlačítka */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h4" component="h1" color="primary" sx={{ flexGrow: 1 }}>
            {game.title}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {isCreator && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/games/${gameId}/edit/base`)}
              >
                Editovat
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={() => navigate(`/games/${gameId}/game`)}
            >
              Hrát
            </Button>
          </Stack>
        </Box>

        {/* Metadata */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<DifficultyIcon value={game.difficulty} />}
            label={`obtížnost ${game.difficulty}/5`}
            sx={difficultyChipSx}
          />
          <Chip
            icon={<FlagIcon />}
            label={`${game.checkpoints.length} ${pluralCs(game.checkpoints.length, 'bod', 'body', 'bodů')}`}
            sx={routeChipSx}
          />
          {routeDistance !== undefined && (
            <Chip
              icon={<RouteIcon />}
              label={`trasa ${formatDistance(routeDistance)}`}
              sx={routeChipSx}
            />
          )}
          {game.tags?.map((tagId) => {
            const tagDef = GAME_TAGS.find((t) => t.id === tagId);
            return tagDef ? <Chip key={tagId} label={tagDef.label} sx={tagChipSx} /> : null;
          })}
        </Box>

        <Divider />

        {/* Popis */}
        {game.description && (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {game.description}
          </Typography>
        )}

        {/* Mapa checkpointů */}
        {sortedCheckpoints.length > 0 && (
          <Box>
            <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <MapComponent center={mapCenter} zoom={13} markers={markers} height={320} />
            </Box>
            {/* Celou trasu vidí jen tvůrce – hráčům by prozradila polohu dalších bodů */}
            {isCreator && sortedCheckpoints.length > 1 && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showAllWaypoints}
                    onChange={(e) => setShowAllWaypoints(e.target.checked)}
                  />
                }
                label="Zobrazit všechny waypointy"
                sx={{ mt: 1, color: 'text.secondary' }}
              />
            )}
          </Box>
        )}

        {/* Tvůrce – méně výrazně pod mapou */}
        <Typography variant="caption" color="text.disabled">
          Vytvořil: {game.creator?.username ?? 'Neznámý'}
        </Typography>
      </Stack>

      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={clearSuccessMessage}>
        <Alert severity="success" onClose={clearSuccessMessage}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
