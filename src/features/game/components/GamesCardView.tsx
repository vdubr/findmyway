// Kartovy rezim zobrazeni dostupnych her
// Zobrazuje hry jako karty v gridu

import { Box, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GameCard from '../../../components/GameCard';
import type { Game } from '../../../types';

interface GamesCardViewProps {
  games: Game[];
  // Mapa vzdalenosti her od uzivatele (game.id → metry)
  distances?: Record<string, number>;
  // ID prihlaşeného uzivatele – karty vlastnich her dostanou tlacitko editace
  userId?: string;
}

export default function GamesCardView({ games, distances, userId }: GamesCardViewProps) {
  const navigate = useNavigate();

  return (
    <Box>
      <Grid container spacing={3}>
        {games.map((game) => (
          <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <GameCard
              game={game}
              distance={distances?.[game.id]}
              onEdit={
                userId && game.creator_id === userId
                  ? () => navigate(`/admin/${game.id}/base`)
                  : undefined
              }
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
