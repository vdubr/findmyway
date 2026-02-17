// Komponenta pro zadávání GPS souřadnic ve formátu DMS pomocí iOS-style drum roll pickers
import { Box, Grid, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useState } from 'react';
import type { CoordinateDMS } from '../../../types';
import DrumRollPicker from './DrumRollPicker';

interface CoordinatePickerProps {
  latitude: CoordinateDMS;
  longitude: CoordinateDMS;
  onLatitudeChange: (value: CoordinateDMS) => void;
  onLongitudeChange: (value: CoordinateDMS) => void;
}

export default function CoordinatePicker({
  latitude,
  longitude,
  onLatitudeChange,
  onLongitudeChange,
}: CoordinatePickerProps) {
  const [latDirection, setLatDirection] = useState<'N' | 'S'>(latitude.direction as 'N' | 'S');
  const [lonDirection, setLonDirection] = useState<'E' | 'W'>(longitude.direction as 'E' | 'W');

  const handleLatitudeChange = (field: 'degrees' | 'minutes' | 'seconds', value: number) => {
    onLatitudeChange({
      ...latitude,
      [field]: value,
    });
  };

  const handleLongitudeChange = (field: 'degrees' | 'minutes' | 'seconds', value: number) => {
    onLongitudeChange({
      ...longitude,
      [field]: value,
    });
  };

  const handleLatDirectionChange = (_: React.MouseEvent<HTMLElement>, newDirection: 'N' | 'S' | null) => {
    if (newDirection) {
      setLatDirection(newDirection);
      onLatitudeChange({
        ...latitude,
        direction: newDirection,
      });
    }
  };

  const handleLonDirectionChange = (_: React.MouseEvent<HTMLElement>, newDirection: 'E' | 'W' | null) => {
    if (newDirection) {
      setLonDirection(newDirection);
      onLongitudeChange({
        ...longitude,
        direction: newDirection,
      });
    }
  };

  return (
    <Stack spacing={3}>
      {/* Latitude Section */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom align="center" color="primary">
          Zeměpisná šířka (Latitude)
        </Typography>
        
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <DrumRollPicker
                label="Stupně"
                value={latitude.degrees}
                onChange={(v) => handleLatitudeChange('degrees', v)}
                min={0}
                max={90}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <DrumRollPicker
                label="Minuty"
                value={latitude.minutes}
                onChange={(v) => handleLatitudeChange('minutes', v)}
                min={0}
                max={59}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <DrumRollPicker
                label="Sekundy"
                value={latitude.seconds}
                onChange={(v) => handleLatitudeChange('seconds', v)}
                min={0}
                max={59}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={latDirection}
              exclusive
              onChange={handleLatDirectionChange}
              aria-label="latitude direction"
              size="large"
            >
              <ToggleButton value="N" aria-label="north">
                Sever (N)
              </ToggleButton>
              <ToggleButton value="S" aria-label="south">
                Jih (S)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="body2" align="center" color="text.secondary">
            {latitude.degrees}° {latitude.minutes}' {latitude.seconds}" {latitude.direction}
          </Typography>
        </Stack>
      </Paper>

      {/* Longitude Section */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom align="center" color="secondary">
          Zeměpisná délka (Longitude)
        </Typography>
        
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 4 }}>
              <DrumRollPicker
                label="Stupně"
                value={longitude.degrees}
                onChange={(v) => handleLongitudeChange('degrees', v)}
                min={0}
                max={180}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <DrumRollPicker
                label="Minuty"
                value={longitude.minutes}
                onChange={(v) => handleLongitudeChange('minutes', v)}
                min={0}
                max={59}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <DrumRollPicker
                label="Sekundy"
                value={longitude.seconds}
                onChange={(v) => handleLongitudeChange('seconds', v)}
                min={0}
                max={59}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={lonDirection}
              exclusive
              onChange={handleLonDirectionChange}
              aria-label="longitude direction"
              size="large"
            >
              <ToggleButton value="E" aria-label="east">
                Východ (E)
              </ToggleButton>
              <ToggleButton value="W" aria-label="west">
                Západ (W)
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="body2" align="center" color="text.secondary">
            {longitude.degrees}° {longitude.minutes}' {longitude.seconds}" {longitude.direction}
          </Typography>
        </Stack>
      </Paper>
    </Stack>
  );
}
