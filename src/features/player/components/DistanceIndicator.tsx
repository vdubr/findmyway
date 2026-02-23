// Komponenta pro zobrazení vzdálenosti a pokroku hry

import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import NavigationInfo from './NavigationInfo';

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
  const progress = ((currentIndex + 1) / totalCheckpoints) * 100;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* NavigationInfo - absolutně pozicovaná polokoule přetékající nad mapu */}
      <NavigationInfo
        distance={distance}
        isInRadius={isInRadius}
        checkpointReached={checkpointReached}
      />

      {/* Progress bar card */}
      <Card
        sx={{
          bgcolor: checkpointReached ? 'success.light' : 'background.paper',
        }}
      >
        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
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
        </CardContent>
      </Card>
    </Box>
  );
}
