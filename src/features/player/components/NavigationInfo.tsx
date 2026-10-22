// Navigační kapsle: liška se šipkou ke checkpointu, vzdálenost a stav (blízko / v dosahu)

import { LocationOn as LocationIcon, Navigation as NavigationIcon } from '@mui/icons-material';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import foxWaving from '../../../assets/fox/liska_mava.webp';
import foxTraveling from '../../../assets/fox/liska_na_cestach_sbatohem_a_buzolou.webp';
import { continuousAngle, formatDistance, arrowAngle as getArrowAngle } from '../../../utils/geo';

interface NavigationInfoProps {
  distance: number | null; // v metrech
  isInRadius: boolean;
  checkpointReached: boolean;
  bearing?: number | null; // azimut k checkpointu (0-360 od severu)
  heading?: number | null; // kam míří telefon podle kompasu (0-360 od severu)
  currentIndex?: number; // pořadí aktuálního bodu (od 0)
  totalCheckpoints?: number;
  onClick?: () => void; // callback pro klik na kapsli (přiblížení mapy na checkpoint)
}

// Úhel šipky měněný po nejkratší cestě (viz continuousAngle); bez polohy se šipka neotáčí
function useContinuousAngle(angle: number | null): number | null {
  const lastRef = useRef<number | null>(null);
  if (angle === null) return null;
  lastRef.current = continuousAngle(lastRef.current, angle);
  return lastRef.current;
}

// Při vstupu do dosahu krátce zavibrovat (kde to prohlížeč umí)
function useVibrateOnEnter(active: boolean) {
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) navigator.vibrate?.(200);
    wasActive.current = active;
  }, [active]);
}

const capsuleSx = {
  borderRadius: '28px',
  px: 2,
  py: 1.5,
  boxShadow: '0 8px 24px rgba(14, 42, 28, 0.25)',
  transition: 'transform 0.15s ease-in-out',
  '@keyframes capsulePulse': {
    '0%': { transform: 'scale(1)' },
    '40%': { transform: 'scale(1.06)' },
    '100%': { transform: 'scale(1)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none !important' },
} as const;

export default function NavigationInfo({
  distance,
  isInRadius,
  checkpointReached,
  bearing = null,
  heading = null,
  currentIndex,
  totalCheckpoints,
  onClick,
}: NavigationInfoProps) {
  // S kompasem šipka ukazuje směr k cíli vzhledem k tomu, kam míří telefon.
  // Bez kompasu (desktop, zamítnuté oprávnění) ukazuje azimut vůči severu jako na mapě.
  const hasCompass = heading !== null;
  const targetAngle = getArrowAngle(bearing, heading);
  const arrowAngle = useContinuousAngle(targetAngle);
  useVibrateOnEnter(isInRadius || checkpointReached);

  // Stav se ukazuje plným štítkem, ne barvou textu vzdálenosti –
  // syté stavové barvy jako text na světlém pozadí nesplňují kontrast a na slunci mizí
  const isNear = !isInRadius && distance !== null && distance < 100;
  const hasOrder = currentIndex !== undefined && totalCheckpoints !== undefined;
  const pointOrder = hasOrder ? `${currentIndex + 1} z ${totalCheckpoints}` : '';
  const towardsLabel = hasOrder ? `k bodu ${pointOrder}` : 'k checkpointu';
  const reachedLabel = hasOrder ? `Bod ${pointOrder} je tvůj` : 'Checkpoint je tvůj';

  const interactiveSx = onClick
    ? { cursor: 'pointer', '&:active': { transform: 'scale(0.98)' } }
    : {};

  if (checkpointReached) {
    return (
      <Box
        onClick={onClick}
        role="status"
        sx={{
          ...capsuleSx,
          ...interactiveSx,
          bgcolor: 'success.light',
          border: 3,
          borderColor: 'success.main',
          animation: 'capsulePulse 0.45s ease-out',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            component="img"
            src={foxWaving}
            alt=""
            sx={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" component="p" lineHeight={1}>
              Jsi tady!
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {reachedLabel}
            </Typography>
          </Box>
          <Chip icon={<LocationIcon />} label="V dosahu" color="success" size="small" />
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        ...capsuleSx,
        ...interactiveSx,
        bgcolor: 'background.paper',
        animation: isInRadius ? 'capsulePulse 0.45s ease-out' : 'none',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        {/* Liška se šipkou ke checkpointu */}
        <Box
          sx={{
            position: 'relative',
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: '#FFE3D3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src={foxTraveling}
            alt=""
            sx={{ width: 46, height: 46, objectFit: 'contain' }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 28,
              height: 28,
              borderRadius: '50%',
              bgcolor: 'secondary.main',
              border: '3px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <NavigationIcon
              aria-hidden
              sx={{
                fontSize: 16,
                color: 'secondary.contrastText',
                transform: arrowAngle !== null ? `rotate(${arrowAngle}deg)` : 'none',
                transition: 'transform 0.3s ease-out',
              }}
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h2" component="p" color="text.primary" lineHeight={1}>
            {distance !== null ? formatDistance(distance) : '---'}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {targetAngle !== null && !hasCompass
              ? `${towardsLabel}, šipka vůči severu`
              : towardsLabel}
          </Typography>
        </Box>

        {isInRadius && (
          <Chip icon={<LocationIcon />} label="V dosahu" color="success" size="small" />
        )}
        {isNear && <Chip label="Blízko" color="warning" size="small" />}
      </Stack>
    </Box>
  );
}
