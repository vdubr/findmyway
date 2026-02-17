import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Map as MapIcon,
  Login as LoginIcon,
  PlayArrow as PlayIcon,
  LocationOn as LocationIcon,
  Create as CreateIcon,
} from '@mui/icons-material';
import { useAuth } from '../../auth/AuthContext';
import { getPublicGames } from '../../../lib/api';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorDisplay from '../../../components/ErrorDisplay';
import type { Game } from '../../../types';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicGames();
      setGames(data);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Nepodařilo se načíst hry');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero sekce */}
      <Box
        sx={{
          textAlign: 'center',
          mb: 6,
          py: { xs: 4, md: 8 },
        }}
      >
        <Typography variant="h2" color="primary" gutterBottom>
          GeoQuest
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Dobrodružná geolokační hra pro děti i dospělé
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<CreateIcon />}
              onClick={() => navigate('/admin')}
            >
              Vytvořit hru
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/auth')}
            >
              Přihlásit se
            </Button>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && <ErrorDisplay message={error} onRetry={loadGames} />}

      {/* Seznam her */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dostupné hry
        </Typography>

        {games.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography>Zatím nejsou k dispozici žádné veřejné hry.</Typography>
            {user && <Typography variant="body2">Buďte první a vytvořte hru!</Typography>}
          </Alert>
        ) : (
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {games.map((game) => (
              <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" color="primary" gutterBottom>
                      {game.title}
                    </Typography>

                    {game.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {game.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={<LocationIcon />}
                        label={`Obtížnost: ${'⭐'.repeat(game.difficulty)}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>

                  <CardActions>
                    <Button
                      variant="contained"
                      startIcon={<PlayIcon />}
                      onClick={() => navigate(`/play/${game.id}`)}
                      fullWidth
                    >
                      Hrát
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Info sekce */}
      <Box
        sx={{
          mt: 8,
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <MapIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                GPS Navigation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Používej GPS a naviguj k checkpointům
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <LocationIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Zajímavá místa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Objevuj zajímavá místa ve svém okolí
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <CreateIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Vytvoř vlastní hru
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Staň se tvůrcem a vytvoř hru pro ostatní
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
