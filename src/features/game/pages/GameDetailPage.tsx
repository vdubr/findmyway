// Detail hry – popis, mapa checkpointů, info o tvůrci, tlačítka Hrát/Editovat

import { Edit as EditIcon, Flag as FlagIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import DifficultyIcon from '../../../components/DifficultyIcon';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useAuth } from '../../auth/AuthContext';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import { useGameDetailStore } from '../store/gameDetailStore';
import { getGameById } from '../../../lib/api';
import { useState } from 'react';
import type { Checkpoint, GameWithCreator } from '../../../types';
import { GAME_TAGS } from '../../../utils/constants';
import { calculateDistance, formatDistance } from '../../../utils/geo';

// Typ pro hru s tvůrcem a checkpointy
type GameFull = GameWithCreator & { checkpoints: Checkpoint[] };

export default function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const setDetailGame = useGameDetailStore((s) => s.setGame);

  const [game, setGame] = useState<GameFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllWaypoints, setShowAllWaypoints] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = (await getGameById(gameId)) as unknown as GameFull;
        setGame(data);
        setDetailGame(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nepodařilo se načíst hru');
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
            label=""
            color="primary"
            variant="outlined"
          />
          <Chip icon={<FlagIcon />} label={String(game.checkpoints.length)} variant="outlined" />
          {routeDistance !== undefined && (
            <Chip label={formatDistance(routeDistance)} variant="outlined" />
          )}
          {game.tags?.map((tagId) => {
            const tagDef = GAME_TAGS.find((t) => t.id === tagId);
            return tagDef ? (
              <Chip key={tagId} label={tagDef.label} size="small" variant="outlined" />
            ) : null;
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
            {sortedCheckpoints.length > 1 && (
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
    </Container>
  );
}
