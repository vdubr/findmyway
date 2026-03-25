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
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, TouchEvent } from 'react';
import type { GeoLocation } from '../../../types';
import { calculateCentroid } from '../../../utils/geo';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';
import type { MapZoomRef } from '../../map/hooks/useMapZoom';
import { useGameEditorStore } from '../store/gameEditorStore';

interface MapEditorProps {
  onSave?: () => void;
  isLoading?: boolean;
}

export default function MapEditor({ onSave, isLoading = false }: MapEditorProps) {
  const {
    currentGame,
    tempCheckpoints,
    selectedCheckpointId,
    addTempCheckpoint,
    deleteTempCheckpoint,
    selectCheckpoint,
    reorderCheckpoints,
  } = useGameEditorStore();

  const showRadii = currentGame?.settings?.show_radius ?? true;

  const mapRef = useRef<MapZoomRef>(null);

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
      radius: showRadii ? cp.radius : undefined,
    }));
  }, [tempCheckpoints, showRadii]);

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

  // Drag-and-drop stav (myš i dotyk)
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      reorderCheckpoints(fromIndex, toIndex);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  // Touch drag-and-drop pro mobilní zařízení
  // touchmove musí být non-passive aby šlo volat preventDefault() a zabránit scrollování
  const listRef = useRef<HTMLUListElement>(null);

  const getIndexFromPoint = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const item = (el as HTMLElement).closest('[data-drag-index]') as HTMLElement | null;
    if (!item) return null;
    return Number(item.dataset.dragIndex);
  };

  const handleTouchStart = (_e: TouchEvent, index: number) => {
    dragIndexRef.current = index;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const toIndex = getIndexFromPoint(touch.clientX, touch.clientY);
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
      reorderCheckpoints(fromIndex, toIndex);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  // Registrace non-passive touchmove přímo na DOM – React neumožňuje passive: false přes JSX
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onTouchMove = (e: globalThis.TouchEvent) => {
      if (dragIndexRef.current === null) return;
      e.preventDefault();
      const touch = e.touches[0];
      const idx = getIndexFromPoint(touch.clientX, touch.clientY);
      if (idx !== null) setDragOverIndex(idx);
    };
    list.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => list.removeEventListener('touchmove', onTouchMove);
  }, []);

  const canSave = tempCheckpoints.length > 0;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Mapa */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <CardContent
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                p: 2,
                '&:last-child': { pb: 2 },
              }}
            >
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

              <Box sx={{ flex: 1, minHeight: 300 }}>
                <MapComponent
                  ref={mapRef}
                  center={mapCenter}
                  zoom={initialZoom}
                  markers={markers}
                  onMapClick={handleMapClick}
                  height="100%"
                />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Seznam checkpointů */}
        <Box
          sx={{
            width: { xs: '100%', md: 350 },
            minHeight: { xs: 300, md: 0 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Card sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <CardContent
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                p: 2,
                '&:last-child': { pb: 2 },
              }}
            >
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
                <List ref={listRef} sx={{ flex: 1, overflow: 'auto' }}>
                  {tempCheckpoints.map((checkpoint, index) => (
                    <ListItem
                      key={checkpoint.tempId}
                      draggable
                      data-drag-index={index}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchEnd={handleTouchEnd}
                      sx={{
                        border: 1,
                        borderColor: dragOverIndex === index ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        bgcolor:
                          dragOverIndex === index
                            ? 'action.hover'
                            : selectedCheckpointId === checkpoint.tempId
                              ? 'action.selected'
                              : 'background.paper',
                        transition: 'border-color 0.15s, bgcolor 0.15s',
                        '&:hover': {
                          bgcolor:
                            dragOverIndex === index || selectedCheckpointId === checkpoint.tempId
                              ? undefined
                              : 'action.hover',
                        },
                      }}
                      onClick={() => {
                        mapRef.current?.zoomToLocation({
                          latitude: checkpoint.latitude,
                          longitude: checkpoint.longitude,
                        });
                      }}
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Editovat">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCheckpoint(checkpoint.tempId);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Smazat">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCheckpoint(checkpoint.tempId);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      }
                    >
                      <DragIcon
                        sx={{ mr: 1, color: 'text.disabled', cursor: 'grab', flexShrink: 0 }}
                      />
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
