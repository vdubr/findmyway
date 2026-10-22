// Detail hry – popis, mapa checkpointů, info o tvůrci, tlačítka Hrát/Editovat

import {
  Edit as EditIcon,
  Flag as FlagIcon,
  PlayArrow as PlayIcon,
  Extension as PuzzleIcon,
  Route as RouteIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
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
import { formatDistance, routeLength } from '../../../utils/geo';
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
  const routeDistance = useMemo(() => routeLength(sortedCheckpoints), [sortedCheckpoints]);

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

  const authorName = game.creator?.username ?? 'neznámý tvůrce';
  const pointCount = game.checkpoints.length;

  return (
    // Spodní odsazení kvůli liště s tlačítkem Hrát
    <Container maxWidth="md" sx={{ pt: 3, pb: 'calc(120px + env(safe-area-inset-bottom))' }}>
      <Stack spacing={2.5}>
        {/* Název, autor a editace pro tvůrce */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h2" component="h1">
              {game.title}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Avatar
                src={game.creator?.avatar_url ?? undefined}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#FFE3D3',
                  color: '#8A3A12',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                }}
              >
                {authorName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                Stezku vyznačil(a){' '}
                <Box component="strong" sx={{ color: 'text.primary' }}>
                  {authorName}
                </Box>
              </Typography>
            </Stack>
          </Box>
          {isCreator && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/games/${gameId}/edit/base`)}
              sx={{ flexShrink: 0 }}
            >
              Upravit
            </Button>
          )}
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
            label={`${pointCount} ${pluralCs(pointCount, 'bod', 'body', 'bodů')}`}
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

        {/* Popis */}
        {game.description && (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {game.description}
          </Typography>
        )}

        {/* Mapa checkpointů */}
        {sortedCheckpoints.length > 0 && (
          <Box>
            <Box
              sx={{
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(30, 122, 79, 0.18)',
              }}
            >
              <MapComponent center={mapCenter} zoom={13} markers={markers} height={280} />
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
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={700}>
                      Ukázat všechny body
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hráči vidí jen první bod, ať si nezkazí překvapení
                    </Typography>
                  </Box>
                }
                sx={{ mt: 1.5, alignItems: 'center' }}
              />
            )}
          </Box>
        )}

        {/* Co tě čeká */}
        <Box sx={{ bgcolor: 'background.paper', borderRadius: '20px', p: 2 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 1.5 }}>
            Co tě čeká
          </Typography>
          <Stack direction="row" spacing={1}>
            {[
              { icon: <FlagIcon />, label: 'Dojdi k bodu', bg: '#E4F3E8', fg: 'text.primary' },
              { icon: <PuzzleIcon />, label: 'Vyřeš úkol', bg: '#FFE3D3', fg: '#8A3A12' },
              { icon: <TrophyIcon />, label: 'Najdi poklad', bg: 'warning.light', fg: '#6B4A00' },
            ].map((step) => (
              <Box
                key={step.label}
                sx={{
                  flex: 1,
                  bgcolor: step.bg,
                  color: step.fg,
                  borderRadius: '16px',
                  py: 1.25,
                  px: 0.5,
                  textAlign: 'center',
                }}
              >
                {step.icon}
                <Typography variant="body2" fontWeight={700} sx={{ color: 'inherit' }}>
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>

      {/* Lišta s hlavní akcí dole – v dosahu palce */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1100,
          bgcolor: 'background.paper',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 16px rgba(15, 77, 48, 0.12)',
          px: 2,
          pt: 1.75,
          pb: 'calc(14px + env(safe-area-inset-bottom))',
        }}
      >
        <Container
          maxWidth="md"
          disableGutters
          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" component="p" lineHeight={1.1}>
              {routeDistance !== undefined ? formatDistance(routeDistance) : `${pointCount}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {routeDistance !== undefined
                ? `${pointCount} ${pluralCs(pointCount, 'bod', 'body', 'bodů')}`
                : pluralCs(pointCount, 'bod', 'body', 'bodů')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayIcon />}
            onClick={() => navigate(`/games/${gameId}/game`)}
            sx={{ ml: 'auto', px: 4 }}
          >
            Hrát
          </Button>
        </Container>
      </Box>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={clearSuccessMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={clearSuccessMessage}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
