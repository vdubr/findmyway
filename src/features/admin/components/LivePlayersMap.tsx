// Komponenta pro zobrazeni mapy s checkpointy a real-time pozicemi hracu

import { Close as CloseIcon, People as PeopleIcon } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getCheckpointsByGameId, subscribeToPlayerLocations } from '../../../lib/api';
import type { ActivePlayer, Checkpoint, Game, GeoLocation } from '../../../types';
import MapComponent, { type MapMarker } from '../../map/components/MapComponent';

interface LivePlayersMapProps {
  game: Game;
  open: boolean;
  onClose: () => void;
}

export default function LivePlayersMap({ game, open, onClose }: LivePlayersMapProps) {
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [mapCenter, setMapCenter] = useState<GeoLocation | null>(null);

  // Nacist checkpointy pri otevreni
  useEffect(() => {
    if (!open) return;

    const loadCheckpoints = async () => {
      try {
        const data = await getCheckpointsByGameId(game.id);
        setCheckpoints(data);

        // Nastavit centrum mapy na prvni checkpoint
        if (data.length > 0) {
          setMapCenter({
            latitude: data[0].latitude,
            longitude: data[0].longitude,
          });
        }
      } catch (err) {
        console.error('Chyba pri nacitani checkpointu:', err);
      }
    };

    loadCheckpoints();
  }, [open, game.id]);

  // Subscripce na real-time pozice hracu
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeToPlayerLocations(game.id, (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      unsubscribe();
    };
  }, [open, game.id]);

  // Pripravit markery pro mapu
  const markers: MapMarker[] = [
    // Checkpointy
    ...checkpoints.map((cp, index) => ({
      id: `checkpoint-${cp.id}`,
      location: {
        latitude: cp.latitude,
        longitude: cp.longitude,
      },
      type: 'checkpoint' as const,
      label: `${index + 1}`,
    })),
    // Hraci
    ...players.map((player) => ({
      id: `player-${player.id}`,
      location: {
        latitude: player.latitude,
        longitude: player.longitude,
      },
      type: 'player' as const,
      tooltip: `${player.username || 'Hrac'} (${player.current_checkpoint_index + 1}/${checkpoints.length})`,
    })),
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon color="primary" />
          <Typography variant="h6">Aktivni hraci - {game.title}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ display: 'flex', height: '70vh' }}>
          {/* Mapa */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            {mapCenter ? (
              <MapComponent center={mapCenter} zoom={14} markers={markers} height="100%" />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  bgcolor: 'grey.100',
                }}
              >
                <Typography color="text.secondary">Nacitam mapu...</Typography>
              </Box>
            )}
          </Box>

          {/* Seznam hracu */}
          <Paper
            elevation={0}
            sx={{
              width: 280,
              borderLeft: 1,
              borderColor: 'divider',
              overflow: 'auto',
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="primary">
                Hraci ({players.length})
              </Typography>
            </Box>

            {players.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Zadni aktivni hraci
                </Typography>
              </Box>
            ) : (
              <List dense>
                {players.map((player) => (
                  <ListItem key={player.id}>
                    <ListItemText
                      primary={player.username || 'Neznamy hrac'}
                      secondary={`Checkpoint ${player.current_checkpoint_index + 1}/${checkpoints.length}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
