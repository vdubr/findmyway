// Kartovy rezim zobrazeni dostupnych her
// Zobrazuje hry jako karty v gridu

import { Box, Grid } from '@mui/material';
import GameCard from '../../../components/GameCard';
import type { Game } from '../../../types';

interface GamesCardViewProps {
  games: Game[];
}

export default function GamesCardView({ games }: GamesCardViewProps) {
  return (
    <Box>
      <Grid container spacing={3}>
        {games.map((game) => (
          <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <GameCard game={game} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
