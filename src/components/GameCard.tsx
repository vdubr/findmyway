// Sdilena komponenta pro zobrazeni karty hry
// Pouziva se v adminu (editovatelna) i v prehledu her (jen pro cteni)

import { Edit as EditIcon, Flag as FlagIcon, NearMe as NearMeIcon } from '@mui/icons-material';
import {
  Box,
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
import DifficultyIcon from './DifficultyIcon';

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
  // Pocet waypointu (checkpointu) v hre
  checkpointCount?: number;
  // Celkova delka trasy v metrech
  routeDistance?: number;
  // Callback pro editaci hry (zobrazí tužku v hlavičce karty)
  onEdit?: () => void;
}

export default function GameCard({
  game,
  actions,
  showStatus = false,
  showDate = false,
  distance,
  checkpointCount,
  routeDistance,
  onEdit,
}: GameCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/games/${game.id}`)}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
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
              icon={<DifficultyIcon value={game.difficulty} />}
              label=""
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
            {checkpointCount !== undefined && (
              <Chip
                icon={<FlagIcon />}
                label={String(checkpointCount)}
                size="small"
                variant="outlined"
              />
            )}
            {routeDistance !== undefined && (
              <Chip
                icon={<NearMeIcon />}
                label={formatDistance(routeDistance)}
                size="small"
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

      {actions && <CardActions>{actions}</CardActions>}
    </Card>
  );
}
