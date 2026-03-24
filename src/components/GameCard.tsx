// Sdilena komponenta pro zobrazeni karty hry
// Pouziva se v adminu (editovatelna) i v prehledu her (jen pro cteni)

import {
  Edit as EditIcon,
  LocationOn as LocationIcon,
  NearMe as NearMeIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game } from '../types';
import { GAME_TAGS } from '../utils/constants';
import { formatDistance } from '../utils/geo';

interface GameCardProps {
  game: Game;
  // Admin mod - vlastni akce misto tlacitka Hrat
  actions?: ReactNode;
  // Zobrazit status chip (draft/published)
  showStatus?: boolean;
  // Zobrazit datum vytvoreni
  showDate?: boolean;
  // Vzdalenost od uzivatele v metrech
  distance?: number;
  // Callback pro editaci hry (zobrazí tužku v hlavičce karty)
  onEdit?: () => void;
}

export default function GameCard({
  game,
  actions,
  showStatus = false,
  showDate = false,
  distance,
  onEdit,
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
          {/* Nazev, volitelny status a tlacitko editace */}
          <Stack direction="row" justifyContent="space-between" alignItems="start">
            <Typography variant="h6" component="div" color="primary" sx={{ flexGrow: 1 }}>
              {game.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 1 }}>
              {showStatus && (
                <Chip
                  label={game.status}
                  size="small"
                  color={game.status === 'published' ? 'success' : 'default'}
                />
              )}
              {onEdit && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Upravit hru"
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
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

          {/* Metadata - obtiznost, vzdalenost a tagy */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<LocationIcon />}
              label={`Obtiznost: ${'*'.repeat(game.difficulty)}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            {distance !== undefined && (
              <Chip
                icon={<NearMeIcon />}
                label={formatDistance(distance)}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
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
