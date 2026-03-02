// Map Editor pro přidávání a správu checkpointů při vytváření hry

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { GeoLocation } from '../../../types';
import { calculateCentroid } from '../../../utils/geo';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import { useGameEditorStore } from '../store/gameEditorStore';

interface MapEditorProps {
  onSave?: () => void;
  isLoading?: boolean;
}

export default function MapEditor({ onSave, isLoading = false }: MapEditorProps) {
  const {
    tempCheckpoints,
    selectedCheckpointId,
    addTempCheckpoint,
    deleteTempCheckpoint,
    selectCheckpoint,
  } = useGameEditorStore();

  const [initializedLocation, setInitializedLocation] = useState(false);

  const [mapCenter, setMapCenter] = useState<GeoLocation>({
    latitude: 50.0755, // Praha jako fallback
    longitude: 14.4378,
  });

  // Zoom level - mensi pro existujici hry s vice checkpointy
  const [initialZoom, setInitialZoom] = useState(13);

  // Pri nacteni komponenty - nastavit spravne centrum mapy
  useEffect(() => {
    if (initializedLocation) return;

    // Pokud jsou checkpointy - vypocitat jejich teziste
    if (tempCheckpoints.length > 0) {
      const centroid = calculateCentroid(tempCheckpoints);
      if (centroid) {
        setMapCenter(centroid);
        // Nastavit zoom podle poctu checkpointu - vic checkpointu = mensi zoom
        setInitialZoom(tempCheckpoints.length > 3 ? 11 : 13);
        setInitializedLocation(true);
      }
    } else {
      // Nova hra - ziskat aktualni polohu uzivatele
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setMapCenter({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setInitialZoom(15); // Blizsi zoom pro novou hru
            setInitializedLocation(true);
          },
          (error) => {
            console.warn('Geolokace neni dostupna:', error.message);
            setInitializedLocation(true); // Pouzit fallback (Praha)
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        setInitializedLocation(true);
      }
    }
  }, [tempCheckpoints, initializedLocation]);

  // Převést tempCheckpoints na MapMarkers
  const markers: MapMarker[] = useMemo(() => {
    return tempCheckpoints.map((cp) => ({
      id: cp.tempId,
      location: { latitude: cp.latitude, longitude: cp.longitude },
      type: 'checkpoint' as const,
      label: `${cp.order_index + 1}`,
    }));
  }, [tempCheckpoints]);

  const handleMapClick = (location: GeoLocation) => {
    addTempCheckpoint(location.latitude, location.longitude);
    setMapCenter(location);
  };

  const handleEditCheckpoint = (tempId: string) => {
    selectCheckpoint(tempId);
  };

  const handleDeleteCheckpoint = (tempId: string) => {
    deleteTempCheckpoint(tempId);
  };

  const canSave = tempCheckpoints.length > 0;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        {/* Mapa */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" color="primary">
                  Umístění checkpointů
                </Typography>
                <Chip
                  icon={<AddIcon />}
                  label={`${tempCheckpoints.length} checkpointů`}
                  color="primary"
                  variant="outlined"
                />
              </Stack>

              <Typography variant="body2" color="text.secondary" mb={2}>
                Klikněte na mapu pro přidání checkpointu
              </Typography>

              <MapComponent
                center={mapCenter}
                zoom={initialZoom}
                markers={markers}
                onMapClick={handleMapClick}
                height="600px"
              />
            </CardContent>
          </Card>
        </Box>

        {/* Seznam checkpointů */}
        <Box sx={{ width: { xs: '100%', md: 350 } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Checkpointy ({tempCheckpoints.length})
              </Typography>

              {tempCheckpoints.length === 0 ? (
                <Paper
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Zatím žádné checkpointy.
                    <br />
                    Klikněte na mapu pro přidání.
                  </Typography>
                </Paper>
              ) : (
                <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                  {tempCheckpoints.map((checkpoint, index) => (
                    <ListItem
                      key={checkpoint.tempId}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor:
                          selectedCheckpointId === checkpoint.tempId
                            ? 'action.selected'
                            : 'background.paper',
                      }}
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Editovat">
                            <IconButton
                              size="small"
                              onClick={() => handleEditCheckpoint(checkpoint.tempId)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Smazat">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteCheckpoint(checkpoint.tempId)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    >
                      <DragIcon sx={{ mr: 1, color: 'text.disabled', cursor: 'grab' }} />
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={index + 1}
                              size="small"
                              color="primary"
                              sx={{ minWidth: 32 }}
                            />
                            <Typography variant="body2" fontWeight="medium">
                              {checkpoint.content.title}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {checkpoint.latitude.toFixed(5)}, {checkpoint.longitude.toFixed(5)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Save button */}
              {canSave && (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<SaveIcon />}
                  onClick={onSave}
                  disabled={isLoading}
                  sx={{ mt: 2 }}
                >
                  {isLoading ? 'Ukládám...' : 'Uložit hru'}
                </Button>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
