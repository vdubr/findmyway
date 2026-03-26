// Detail hry – popis, mapa checkpointů, info o tvůrci, tlačítka Hrát/Editovat

import {
  Edit as EditIcon,
  LocationOn as LocationIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { Box, Button, Chip, Container, Divider, Stack, Typography } from '@mui/material';
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

  // Markery checkpointů pro mapu
  const markers = useMemo<MapMarker[]>(() => {
    if (!game?.checkpoints) return [];
    return game.checkpoints.map((cp, i) => ({
      id: cp.id ?? String(i),
      location: { latitude: cp.latitude, longitude: cp.longitude },
      type: 'checkpoint' as const,
      label: String(i + 1),
    }));
  }, [game]);

  // Střed mapy = centroid checkpointů
  const mapCenter = useMemo(() => {
    if (!game?.checkpoints?.length) return undefined;
    const lats = game.checkpoints.map((cp) => cp.latitude);
    const lons = game.checkpoints.map((cp) => cp.longitude);
    return {
      latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
      longitude: lons.reduce((a, b) => a + b, 0) / lons.length,
    };
  }, [game]);

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
            icon={<LocationIcon />}
            label={`Obtížnost: ${'★'.repeat(game.difficulty)}${'☆'.repeat(5 - game.difficulty)}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${game.checkpoints.length} ${game.checkpoints.length === 1 ? 'checkpoint' : game.checkpoints.length < 5 ? 'checkpointy' : 'checkpointů'}`}
            variant="outlined"
          />
          {game.tags?.map((tagId) => {
            const tagDef = GAME_TAGS.find((t) => t.id === tagId);
            return tagDef ? (
              <Chip key={tagId} label={tagDef.label} size="small" variant="outlined" />
            ) : null;
          })}
        </Box>

        {/* Tvůrce */}
        <Typography variant="body2" color="text.secondary">
          Vytvořil: <strong>{game.creator?.username ?? 'Neznámý'}</strong>
        </Typography>

        <Divider />

        {/* Popis */}
        {game.description && (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {game.description}
          </Typography>
        )}

        {/* Mapa checkpointů */}
        {markers.length > 0 && (
          <Box sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <MapComponent center={mapCenter} zoom={13} markers={markers} height={320} />
          </Box>
        )}
      </Stack>
    </Container>
  );
}
