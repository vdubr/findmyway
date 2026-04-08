// Kartovy rezim zobrazeni dostupnych her
// Zobrazuje hry jako karty v gridu

import { Box, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GameCard from '../../../components/GameCard';
import type { Game, GameWithCheckpoints } from '../../../types';
import { calculateDistance } from '../../../utils/geo';

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
        {games.map((game) => {
          const checkpoints = (game as GameWithCheckpoints).checkpoints;
          const sorted = checkpoints
            ? [...checkpoints].sort((a, b) => a.order_index - b.order_index)
            : [];
          const routeDistance =
            sorted.length >= 2
              ? sorted.reduce(
                  (sum, cp, i) => (i === 0 ? 0 : sum + calculateDistance(sorted[i - 1], cp)),
                  0
                )
              : undefined;
          return (
            <Grid key={game.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <GameCard
                game={game}
                distance={distances?.[game.id]}
                checkpointCount={checkpoints?.length}
                routeDistance={routeDistance}
                onEdit={
                  userId && game.creator_id === userId
                    ? () => navigate(`/games/${game.id}/edit/base`)
                    : undefined
                }
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
