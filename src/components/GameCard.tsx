// Sdilena komponenta pro zobrazeni karty hry
// Pouziva se v adminu (editovatelna) i v prehledu her (jen pro cteni)

import {
  Edit as EditIcon,
  Flag as FlagIcon,
  NearMe as NearMeIcon,
  Route as RouteIcon,
} from '@mui/icons-material';
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
import { brandColors } from '../theme';
import type { Game } from '../types';
import { GAME_TAGS } from '../utils/constants';
import { pluralCs } from '../utils/format';
import { formatDistance } from '../utils/geo';
import DifficultyIcon from './DifficultyIcon';
import { awayChipSx, difficultyChipSx, routeChipSx, tagChipSx } from './gameChipStyles';

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

// Dekorativní náhled trasy – barva podle id hry, aby se karty vizuálně lišily
const THUMB_COLORS = ['#CDEBD6', '#FFE3D3', '#FFF4D1', '#E3F2FA'];

function GameThumb({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return (
    <Box
      aria-hidden
      sx={{
        width: 72,
        height: 72,
        flexShrink: 0,
        borderRadius: '16px',
        overflow: 'hidden',
        bgcolor: THUMB_COLORS[hash % THUMB_COLORS.length],
      }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72">
        <path d="M-4 50 C 20 30, 30 60, 76 26" stroke="#fff" strokeWidth="6" fill="none" />
        <path
          d="M10 64 C 26 44, 46 52, 60 10"
          stroke={brandColors.forestDark}
          strokeWidth="3"
          strokeDasharray="5 5"
          fill="none"
        />
        <circle
          cx="60"
          cy="11"
          r="6"
          fill={brandColors.sun}
          stroke={brandColors.forestDark}
          strokeWidth="2"
        />
      </svg>
    </Box>
  );
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
      <CardContent sx={{ flexGrow: 1, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <GameThumb seed={game.id} />
        <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
          {/* Nazev, volitelny status a tlacitko editace */}
          <Stack direction="row" justifyContent="space-between" alignItems="start">
            <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
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
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Chip
              icon={<DifficultyIcon value={game.difficulty} />}
              label={`${game.difficulty}/5`}
              aria-label={`Obtížnost ${game.difficulty} z 5`}
              size="small"
              sx={difficultyChipSx}
            />
            {distance !== undefined && (
              <Chip
                icon={<NearMeIcon />}
                label={`${formatDistance(distance)} od tebe`}
                size="small"
                sx={awayChipSx}
              />
            )}
            {checkpointCount !== undefined && (
              <Chip
                icon={<FlagIcon />}
                label={`${checkpointCount} ${pluralCs(checkpointCount, 'bod', 'body', 'bodů')}`}
                size="small"
                sx={routeChipSx}
              />
            )}
            {routeDistance !== undefined && (
              <Chip
                icon={<RouteIcon />}
                label={`trasa ${formatDistance(routeDistance)}`}
                size="small"
                sx={routeChipSx}
              />
            )}
            {game.tags?.map((tagId) => {
              const tagDef = GAME_TAGS.find((t) => t.id === tagId);
              return tagDef ? (
                <Chip key={tagId} label={tagDef.label} size="small" sx={tagChipSx} />
              ) : null;
            })}
          </Box>

          {/* Volitelne datum vytvoreni */}
          {showDate && (
            <Typography variant="caption" color="text.secondary">
              Vytvořeno: {new Date(game.created_at).toLocaleDateString('cs-CZ')}
            </Typography>
          )}
        </Stack>
      </CardContent>

      {actions && <CardActions>{actions}</CardActions>}
    </Card>
  );
}
