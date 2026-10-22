// Komponenta pro zobrazení vzdálenosti a pokroku hry

import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { brandColors } from '../../../theme';
import NavigationInfo from './NavigationInfo';

interface DistanceIndicatorProps {
  distance: number | null; // v metrech
  isInRadius: boolean;
  checkpointReached: boolean;
  currentIndex: number;
  totalCheckpoints: number;
  bearing?: number | null; // azimut k checkpointu (0-360 od severu)
  heading?: number | null; // kam míří telefon podle kompasu
  onNavigationClick?: () => void; // callback pro klik na navigacni polokouli
}

export default function DistanceIndicator({
  distance,
  isInRadius,
  checkpointReached,
  currentIndex,
  totalCheckpoints,
  bearing,
  heading,
  onNavigationClick,
}: DistanceIndicatorProps) {
  const progress = ((currentIndex + 1) / totalCheckpoints) * 100;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* NavigationInfo - absolutně pozicovaná polokoule přetékající nad mapu */}
      <NavigationInfo
        distance={distance}
        isInRadius={isInRadius}
        checkpointReached={checkpointReached}
        bearing={bearing}
        heading={heading}
        onClick={onNavigationClick}
      />

      {/* Progress bar card */}
      <Card
        sx={{
          bgcolor: checkpointReached ? 'success.light' : brandColors.appBackground,
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
