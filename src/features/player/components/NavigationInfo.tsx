// Komponenta pro zobrazení navigačních informací (vzdálenost a směr)

import {
  CheckCircle as CheckIcon,
  LocationOn as LocationIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useRef } from 'react';
import { continuousAngle, formatDistance, arrowAngle as getArrowAngle } from '../../../utils/geo';

interface NavigationInfoProps {
  distance: number | null; // v metrech
  isInRadius: boolean;
  checkpointReached: boolean;
  bearing?: number | null; // azimut k checkpointu (0-360 od severu)
  heading?: number | null; // kam míří telefon podle kompasu (0-360 od severu)
  onClick?: () => void; // callback pro klik na polokouli
}

// Úhel šipky měněný po nejkratší cestě (viz continuousAngle); bez polohy se šipka neotáčí
function useContinuousAngle(angle: number | null): number | null {
  const lastRef = useRef<number | null>(null);
  if (angle === null) return null;
  lastRef.current = continuousAngle(lastRef.current, angle);
  return lastRef.current;
}

export default function NavigationInfo({
  distance,
  isInRadius,
  checkpointReached,
  bearing = null,
  heading = null,
  onClick,
}: NavigationInfoProps) {
  // S kompasem šipka ukazuje směr k cíli vzhledem k tomu, kam míří telefon.
  // Bez kompasu (desktop, zamítnuté oprávnění) ukazuje azimut vůči severu jako na mapě.
  const hasCompass = heading !== null;
  const targetAngle = getArrowAngle(bearing, heading);
  const arrowAngle = useContinuousAngle(targetAngle);

  // Stav se ukazuje plným štítkem s tmavým/bílým textem, ne barvou textu vzdálenosti –
  // syté stavové barvy jako text na světlém pozadí nesplňují kontrast a na slunci mizí
  const isNear = !isInRadius && distance !== null && distance < 100;

  if (checkpointReached) {
    return (
      <Box
        onClick={onClick}
        sx={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          bgcolor: 'success.light',
          borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          px: 3,
          pt: 3,
          pb: 2,
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.15s ease-in-out',
          '&:active': onClick ? { transform: 'translateX(-50%) scale(0.98)' } : {},
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckIcon sx={{ color: 'success.dark' }} />
          <Typography variant="body2" color="success.dark" fontWeight="bold">
            Checkpoint dosažen!
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 300,
        bgcolor: 'background.paper',
        borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
        px: 3,
        pt: 3,
        pb: 2,
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease-in-out',
        '&:active': onClick ? { transform: 'translateX(-50%) scale(0.98)' } : {},
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <NavigationIcon
          aria-hidden
          sx={{
            fontSize: 32,
            color: 'primary.main',
            transform: arrowAngle !== null ? `rotate(${arrowAngle}deg)` : 'none',
            transition: 'transform 0.3s ease-out',
          }}
        />
        <Box>
          <Typography variant="h4" color="text.primary" lineHeight={1}>
            {distance !== null ? formatDistance(distance) : '---'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {targetAngle !== null && !hasCompass
              ? 'k checkpointu, šipka vůči severu'
              : 'k checkpointu'}
          </Typography>
        </Box>
        {isInRadius && (
          <Chip
            icon={<LocationIcon />}
            label="V dosahu"
            color="success"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
        {isNear && <Chip label="Blízko" color="warning" size="small" sx={{ ml: 1 }} />}
      </Stack>
    </Box>
  );
}
