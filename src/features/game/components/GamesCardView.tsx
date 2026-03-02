// Kartovy rezim zobrazeni dostupnych her
// Zobrazuje hry jako karty v gridu s moznosti vyhledavani

import {
  LocationOn as LocationIcon,
  PlayArrow as PlayIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../../../types';

interface GamesCardViewProps {
  games: Game[];
}

export default function GamesCardView({ games }: GamesCardViewProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrovani her podle nazvu
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) {
      return games;
    }
    const query = searchQuery.toLowerCase().trim();
    return games.filter((game) => game.title.toLowerCase().includes(query));
  }, [games, searchQuery]);

  return (
    <Box>
      {/* Vyhledavaci pole */}
      <TextField
        fullWidth
        placeholder="Hledat hru podle nazvu..."
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
        sx={{ mb: 3 }}
      />

      {/* Vysledky */}
      {filteredGames.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          Zadna hra neodpovida hledanemu vyrazu "{searchQuery}"
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredGames.map((game) => (
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
                      label={`Obtiznost: ${'*'.repeat(game.difficulty)}`}
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
                    Hrat
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
