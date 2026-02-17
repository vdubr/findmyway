// Komponenta pro zobrazení vzdálenosti a směru k checkpointu
import { Box, Card, CardContent, LinearProgress, Stack, Typography, Chip } from '@mui/material';
import {
  Navigation as NavigationIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

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
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {/* Progress bar */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="caption" color="text.secondary">
                Postup
              </Typography>
              <Typography variant="caption" color="primary" fontWeight="bold">
                {currentIndex + 1} / {totalCheckpoints}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
          </Box>

          {/* Distance display */}
          <Box>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
              {checkpointReached ? (
                <Chip
                  icon={<CheckIcon />}
                  label="Checkpoint dosažen!"
                  color="success"
                  sx={{ fontSize: '1rem', py: 3 }}
                />
              ) : (
                <>
                  <NavigationIcon
                    sx={{
                      fontSize: 48,
                      color: getDistanceColor() + '.main',
                    }}
                  />
                  <Box textAlign="center">
                    <Typography variant="h3" color={getDistanceColor()}>
                      {distance !== null ? formatDistance(distance) : '---'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      k checkpointu
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Box>

          {/* Status */}
          {isInRadius && !checkpointReached && (
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                  <LocationIcon sx={{ color: 'success.dark' }} />
                  <Typography variant="body2" color="success.dark" fontWeight="bold">
                    Jste v dosahu checkpointu!
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}

          {distance !== null && distance > 500 && !isInRadius && (
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Pokračujte dál, checkpoint je stále daleko
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
