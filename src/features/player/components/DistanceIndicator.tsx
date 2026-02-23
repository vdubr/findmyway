// Komponenta pro zobrazení vzdálenosti a směru k checkpointu

import {
  CheckCircle as CheckIcon,
  LocationOn as LocationIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';
import { Box, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';

interface DistanceIndicatorProps {
  distance: number | null; // v metrech
  isInRadius: boolean;
  checkpointReached: boolean;
  currentIndex: number;
  totalCheckpoints: number;
}

export default function DistanceIndicator({
  distance,
  isInRadius,
  checkpointReached,
  currentIndex,
  totalCheckpoints,
}: DistanceIndicatorProps) {
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

  const progress = ((currentIndex + 1) / totalCheckpoints) * 100;

  return (
    <Card sx={{ bgcolor: checkpointReached ? 'success.light' : 'background.paper' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={1}>
          {/* Progress bar - kompaktní */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
              {currentIndex + 1}/{totalCheckpoints}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ flex: 1, height: 6, borderRadius: 3 }}
            />
          </Stack>

          {/* Distance display - horizontální layout */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            {checkpointReached ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                <CheckIcon sx={{ color: 'success.dark' }} />
                <Typography variant="body2" color="success.dark" fontWeight="bold">
                  Checkpoint dosažen!
                </Typography>
              </Stack>
            ) : (
              <>
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
                </Stack>

                {isInRadius && (
                  <Chip
                    icon={<LocationIcon />}
                    label="V dosahu"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
              </>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
