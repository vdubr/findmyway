import { ViewModule as CardsIcon, Map as MapIcon, Search as SearchIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Container,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadGames je stabilni funkce, spousti se pouze pri mountu
  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPublicGamesWithCheckpoints();
      setGames(data as unknown as GameWithCheckpoints[]);
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

  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return games;
    const q = searchQuery.toLowerCase().trim();
    return games.filter((g) => g.title.toLowerCase().includes(q));
  }, [games, searchQuery]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Error display */}
      {error && <ErrorDisplay message={error} onRetry={loadGames} />}

      {/* Toolbar: vyhledavani + prepinac */}
      {games.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <TextField
            placeholder="Hledat hru..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            autoComplete="off"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flexGrow: 1 }}
          />
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
        </Box>
      )}

      {/* Obsah */}
      {games.length === 0 ? (
        <Alert severity="info">
          <Typography>Zatim nejsou k dispozici zadne verejne hry.</Typography>
          {user && <Typography variant="body2">Budte prvni a vytvorte hru!</Typography>}
        </Alert>
      ) : filteredGames.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Žádná hra neodpovídá hledanému výrazu „{searchQuery}"
        </Typography>
      ) : viewMode === 'cards' ? (
        <GamesCardView games={filteredGames} />
      ) : (
        <GamesMapView games={filteredGames} />
      )}
    </Container>
  );
}
