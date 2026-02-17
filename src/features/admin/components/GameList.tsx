// Seznam vlastních her s možností editace a mazání
import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Public as PublicIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { getMyGames, deleteGame, updateGame } from '../../../lib/api';
import type { Game } from '../../../types';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorDisplay from '../../../components/ErrorDisplay';

interface GameListProps {
  onEdit?: (game: Game) => void;
}

export default function GameList({ onEdit }: GameListProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyGames();
      setGames(data as Game[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při načítání her');
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
      setError(err instanceof Error ? err.message : 'Chyba při mazání hry');
    }
  };

  const handleTogglePublish = async (game: Game) => {
    try {
      const newStatus = game.status === 'published' ? 'draft' : 'published';
      const updated = await updateGame(game.id, { status: newStatus });
      setGames((prev) => prev.map((g) => (g.id === game.id ? updated : g)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba při aktualizaci hry');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error} />;

  return (
    <Box>
      {games.length === 0 ? (
        <Alert severity="info">
          Zatím jste nevytvořili žádnou hru. Začněte kliknutím na tlačítko "Nová hra".
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {games.map((game) => (
            <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    {/* Název a status */}
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Typography variant="h6" component="div">
                        {game.title}
                      </Typography>
                      <Chip
                        label={game.status}
                        size="small"
                        color={game.status === 'published' ? 'success' : 'default'}
                      />
                    </Stack>

                    {/* Popis */}
                    {game.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {game.description}
                      </Typography>
                    )}

                    {/* Metadata */}
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        icon={game.is_public ? <PublicIcon /> : <LockIcon />}
                        label={game.is_public ? 'Veřejná' : 'Soukromá'}
                        size="small"
                      />
                      <Chip label={`Obtížnost: ${game.difficulty}/5`} size="small" />
                    </Stack>

                    {/* Datum vytvoření */}
                    <Typography variant="caption" color="text.secondary">
                      Vytvořeno: {new Date(game.created_at).toLocaleDateString('cs-CZ')}
                    </Typography>
                  </Stack>
                </CardContent>

                <CardActions>
                  <Stack direction="row" spacing={1} width="100%" justifyContent="flex-end">
                    {onEdit && (
                      <IconButton
                        size="small"
                        onClick={() => onEdit(game)}
                        title="Editovat"
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
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
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Smazat hru?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Opravdu chcete smazat hru "{gameToDelete?.title}"? Tato akce je nevratná a smaže i
            všechny checkpointy.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Zrušit</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Smazat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
