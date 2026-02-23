// Komponenta pro zobrazení navigačních informací (vzdálenost a směr)

import {
  CheckCircle as CheckIcon,
  LocationOn as LocationIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';
import { Box, Chip, Stack, Typography } from '@mui/material';

interface NavigationInfoProps {
  distance: number | null; // v metrech
  isInRadius: boolean;
  checkpointReached: boolean;
  onClick?: () => void; // callback pro klik na polokouli
}

export default function NavigationInfo({
  distance,
  isInRadius,
  checkpointReached,
  onClick,
}: NavigationInfoProps) {
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getDistanceColor = (): 'error' | 'warning' | 'success' => {
    if (!distance) return 'error';
    if (isInRadius) return 'success';
    if (distance < 100) return 'warning';
    return 'error';
  };

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
          sx={{
            fontSize: 32,
            color: getDistanceColor() + '.main',
          }}
        />
        <Box>
          <Typography variant="h5" color={getDistanceColor()} lineHeight={1.2}>
            {distance !== null ? formatDistance(distance) : '---'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            k checkpointu
          </Typography>
        </Box>
        {isInRadius && (
          <Chip
            icon={<LocationIcon />}
            label="V dosahu"
            color="success"
            size="small"
            sx={{ fontWeight: 'bold', ml: 1 }}
          />
        )}
      </Stack>
    </Box>
  );
}
