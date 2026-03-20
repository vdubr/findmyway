// Seznam vlastnich her s moznosti editace a mazani

import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import GameCard from '../../../components/GameCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { deleteGame, getActivePlayersCount, getMyGames, updateGame } from '../../../lib/api';
import type { Game } from '../../../types';
import LivePlayersMap from './LivePlayersMap';

export default function GameList() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  // State pro zobrazeni aktivnich hracu
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [liveMapGame, setLiveMapGame] = useState<Game | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadGames je stabilni funkce, spousti se pouze pri mountu
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyGames();
      setGames(data as unknown as Game[]);

      // Nacist pocty aktivnich hracu pro kazdu hru se sdilenim polohy
      const gamesWithLocationSharing = (data as unknown as Game[]).filter(
        (g) => g.settings?.share_location_required
      );
      if (gamesWithLocationSharing.length > 0) {
        const counts = await Promise.all(
          gamesWithLocationSharing.map(async (g) => ({
            id: g.id,
            count: await getActivePlayersCount(g.id),
          }))
        );
        const countsMap = counts.reduce(
          (acc, { id, count }) => {
            acc[id] = count;
            return acc;
          },
          {} as Record<string, number>
        );
        setPlayerCounts(countsMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri nacitani her');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (game: Game) => {
    setGameToDelete(game);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!gameToDelete) return;

    try {
      await deleteGame(gameToDelete.id);
      setGames((prev) => prev.filter((g) => g.id !== gameToDelete.id));
      setDeleteDialogOpen(false);
      setGameToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri mazani hry');
    }
  };

  const handleTogglePublish = async (game: Game) => {
    try {
      const newStatus = game.status === 'published' ? 'draft' : 'published';
      const updated = await updateGame(game.id, { status: newStatus });
      setGames((prev) => prev.map((g) => (g.id === game.id ? updated : g)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri aktualizaci hry');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <Box>
      {games.length === 0 ? (
        <Alert severity="info">
          Zatim jste nevytvorili zadnou hru. Zacnete kliknutim na tlacitko "Nova hra".
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {games.map((game) => (
            <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <GameCard
                game={game}
                showStatus
                showDate
                actions={
                  <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end">
                    {/* Tlacitko pro zobrazeni aktivnich hracu */}
                    {game.settings?.share_location_required && (
                      <IconButton
                        size="small"
                        onClick={() => setLiveMapGame(game)}
                        title="Zobrazit aktivni hrace"
                        color="info"
                      >
                        <PeopleIcon />
                        {playerCounts[game.id] > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              bgcolor: 'info.main',
                              color: 'white',
                              borderRadius: '50%',
                              width: 16,
                              height: 16,
                              fontSize: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {playerCounts[game.id]}
                          </Typography>
                        )}
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/${game.id}/base`)}
                      title="Editovat"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleTogglePublish(game)}
                      title={game.status === 'published' ? 'Odpublikovat' : 'Publikovat'}
                      color={game.status === 'published' ? 'success' : 'default'}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(game)}
                      title="Smazat"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                }
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Smazat hru?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Opravdu chcete smazat hru "{gameToDelete?.title}"? Tato akce je nevratna a smaze i
            vsechny checkpointy.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Zrusit</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Smazat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Live players map dialog */}
      {liveMapGame && (
        <LivePlayersMap
          game={liveMapGame}
          open={!!liveMapGame}
          onClose={() => setLiveMapGame(null)}
        />
      )}
    </Box>
  );
}
