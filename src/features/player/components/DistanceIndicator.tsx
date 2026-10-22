// Spodní herní panel: navigační kapsle a tlapkový postup hrou

import { Stack } from '@mui/material';
import PawProgress from '../../../components/PawProgress';
import NavigationInfo from './NavigationInfo';

interface DistanceIndicatorProps {
  distance: number | null; // v metrech
  isInRadius: boolean;
  checkpointReached: boolean;
  currentIndex: number;
  totalCheckpoints: number;
  bearing?: number | null; // azimut k checkpointu (0-360 od severu)
  heading?: number | null; // kam míří telefon podle kompasu
  onNavigationClick?: () => void; // callback pro klik na navigační kapsli
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
  return (
    <Stack spacing={1}>
      <NavigationInfo
        distance={distance}
        isInRadius={isInRadius}
        checkpointReached={checkpointReached}
        bearing={bearing}
        heading={heading}
        currentIndex={currentIndex}
        totalCheckpoints={totalCheckpoints}
        onClick={onNavigationClick}
      />
      <PawProgress
        current={currentIndex}
        total={totalCheckpoints}
        currentDone={checkpointReached}
      />
    </Stack>
  );
}
