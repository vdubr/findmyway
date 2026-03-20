// Sdilena komponenta pro zobrazeni karty hry
// Pouziva se v adminu (editovatelna) i v prehledu her (jen pro cteni)

import { LocationOn as LocationIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../types';
import { GAME_TAGS } from '../utils/constants';

interface GameCardProps {
  game: Game;
  // Admin mod - vlastni akce misto tlacitka Hrat
  actions?: ReactNode;
  // Zobrazit status chip (draft/published)
  showStatus?: boolean;
  // Zobrazit datum vytvoreni
  showDate?: boolean;
}

export default function GameCard({
  game,
  actions,
  showStatus = false,
  showDate = false,
}: GameCardProps) {
  const navigate = useNavigate();

  return (
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
        <Stack spacing={2}>
          {/* Nazev a volitelny status */}
          <Stack direction="row" justifyContent="space-between" alignItems="start">
            <Typography variant="h6" component="div" color="primary">
              {game.title}
            </Typography>
            {showStatus && (
              <Chip
                label={game.status}
                size="small"
                color={game.status === 'published' ? 'success' : 'default'}
              />
            )}
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

          {/* Metadata - obtiznost a tagy */}
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

          {/* Volitelne datum vytvoreni */}
          {showDate && (
            <Typography variant="caption" color="text.secondary">
              Vytvoreno: {new Date(game.created_at).toLocaleDateString('cs-CZ')}
            </Typography>
          )}
        </Stack>
      </CardContent>

      <CardActions>
        {actions ?? (
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={() => navigate(`/play/${game.id}`)}
            fullWidth
          >
            Hrat
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
