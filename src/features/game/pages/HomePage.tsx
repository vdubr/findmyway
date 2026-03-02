import { ViewModule as CardsIcon, Map as MapIcon } from '@mui/icons-material';
import { Alert, Box, Container, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
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
    </Container>
  );
}
