import {
  ViewModule as CardsIcon,
  Create as CreateIcon,
  LocationOn as LocationIcon,
  Login as LoginIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorDisplay from '../../../components/ErrorDisplay';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { getPublicGamesWithCheckpoints } from '../../../lib/api';
import type { Checkpoint, Game } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import GamesCardView from '../components/GamesCardView';
import GamesMapView from '../components/GamesMapView';

type ViewMode = 'cards' | 'map';

// Typ pro hru s checkpointy (pro mapovy rezim)
type GameWithCheckpoints = Game & { checkpoints: Checkpoint[] };

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState<GameWithCheckpoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadGames je stabilni funkce, spousti se pouze pri mountu
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicGamesWithCheckpoints();
      setGames(data as GameWithCheckpoints[]);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Nepodarilo se nacist hry');
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
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
          Dobrodruzna geolokacni hra pro deti i dospele
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 4,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {user ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<CreateIcon />}
              onClick={() => navigate('/admin')}
            >
              Vytvorit hru
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => navigate('/auth')}
            >
              Prihlasit se
            </Button>
          )}
        </Box>
      </Box>

      {/* Error display */}
      {error && <ErrorDisplay message={error} onRetry={loadGames} />}

      {/* Seznam her */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Dostupne hry</Typography>

          {/* Prepinac rezimu zobrazeni */}
          {games.length > 0 && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              aria-label="rezim zobrazeni"
            >
              <ToggleButton value="cards" aria-label="karty">
                <CardsIcon sx={{ mr: 0.5 }} />
                Karty
              </ToggleButton>
              <ToggleButton value="map" aria-label="mapa">
                <MapIcon sx={{ mr: 0.5 }} />
                Mapa
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>

        {games.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography>Zatim nejsou k dispozici zadne verejne hry.</Typography>
            {user && <Typography variant="body2">Budte prvni a vytvorte hru!</Typography>}
          </Alert>
        ) : viewMode === 'cards' ? (
          <GamesCardView games={games} />
        ) : (
          <GamesMapView games={games} />
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
                Pouzivej GPS a naviguj k checkpointum
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <LocationIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Zajimava mista
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Objevuj zajimava mista ve svem okoli
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <CreateIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Vytvor vlastni hru
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Stan se tvurcem a vytvor hru pro ostatni
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
