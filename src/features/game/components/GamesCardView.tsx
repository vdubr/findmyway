// Kartovy rezim zobrazeni dostupnych her
// Zobrazuje hry jako karty v gridu s moznosti vyhledavani

import { LocationOn as LocationIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import { Box, Button, Card, CardActions, CardContent, Chip, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../../../types';
import { GAME_TAGS } from '../../../utils/constants';

interface GamesCardViewProps {
  games: Game[];
}

export default function GamesCardView({ games }: GamesCardViewProps) {
  const navigate = useNavigate();

  return (
    <Box>
      <Grid container spacing={3}>
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
                    label={`Obtiznost: ${'*'.repeat(game.difficulty)}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {game.tags?.map((tagId) => {
                    const tagDef = GAME_TAGS.find((t) => t.id === tagId);
                    return tagDef ? (
                      <Chip key={tagId} label={tagDef.label} size="small" variant="outlined" />
                    ) : null;
                  })}
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
    </Box>
  );
}
