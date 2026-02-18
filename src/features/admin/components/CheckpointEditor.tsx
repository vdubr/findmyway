// Editor pro editaci checkpointu (obsah, typ, řešení)

import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { deleteCheckpointImage, uploadCheckpointImage } from '../../../lib/api';
import type { CheckpointType, CoordinateDMS } from '../../../types';
import { type TempCheckpoint, useGameEditorStore } from '../store/gameEditorStore';

interface CheckpointEditorProps {
  open: boolean;
  onClose: () => void;
}

export default function CheckpointEditor({ open, onClose }: CheckpointEditorProps) {
  const { tempCheckpoints, selectedCheckpointId, updateTempCheckpoint } = useGameEditorStore();

  const selectedCheckpoint = tempCheckpoints.find((cp) => cp.tempId === selectedCheckpointId);

  const [formData, setFormData] = useState<Partial<TempCheckpoint>>(
    selectedCheckpoint || ({} as Partial<TempCheckpoint>)
  );
  const [hasSecretSolution, setHasSecretSolution] = useState(!!selectedCheckpoint?.secret_solution);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    selectedCheckpoint?.content?.image_url || null
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!selectedCheckpoint) return null;

  const handleChange = (field: keyof TempCheckpoint, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContentChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      content: { ...prev.content!, [field]: value },
    }));
  };

  const handleSecretSolutionChange = (
    coord: 'latitude' | 'longitude',
    field: keyof CoordinateDMS,
    value: number | string
  ) => {
    setFormData((prev) => ({
      ...prev,
      secret_solution: {
        latitude:
          coord === 'latitude'
            ? { ...(prev.secret_solution?.latitude || defaultDMS('N')), [field]: value }
            : prev.secret_solution?.latitude || defaultDMS('N'),
        longitude:
          coord === 'longitude'
            ? { ...(prev.secret_solution?.longitude || defaultDMS('E')), [field]: value }
            : prev.secret_solution?.longitude || defaultDMS('E'),
      },
    }));
  };

  const handleSave = async () => {
    if (!formData || !selectedCheckpointId) return;

    // Nejdřív nahrajeme obrázek, pokud existuje
    const imageUrl = await handleImageUpload();

    // Aktualizujeme formData s URL obrázku
    const finalFormData = {
      ...formData,
      content: {
        ...formData.content!,
        image_url: imageUrl,
      },
      secret_solution: hasSecretSolution ? formData.secret_solution || null : null,
    };

    updateTempCheckpoint(selectedCheckpointId, finalFormData);
    onClose();
  };

  const handleToggleSecretSolution = (enabled: boolean) => {
    setHasSecretSolution(enabled);
    if (enabled && !formData.secret_solution) {
      // Initialize with default values
      setFormData((prev) => ({
        ...prev,
        secret_solution: {
          latitude: defaultDMS('N'),
          longitude: defaultDMS('E'),
        },
      }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validace typu souboru
    if (!file.type.startsWith('image/')) {
      setImageError('Vyberte prosím obrázek (PNG, JPG, atd.)');
      return;
    }

    // Validace velikosti (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Obrázek je příliš velký. Maximum je 5MB.');
      return;
    }

    setImageFile(file);
    setImageError(null);

    // Vytvoř preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageDelete = async () => {
    // Pokud má obrázek URL, smažeme ho ze storage
    if (formData.content?.image_url) {
      try {
        await deleteCheckpointImage(formData.content.image_url);
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }

    setImageFile(null);
    setImagePreview(null);
    handleContentChange('image_url', null);
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return formData.content?.image_url || null;

    setUploadingImage(true);
    setImageError(null);

    try {
      // Pro upload potřebujeme gameId a checkpointId
      // Použijeme tempId jako checkpointId (bude nahrazeno po uložení)
      const gameId = 'temp'; // TODO: Use real game ID
      const checkpointId = selectedCheckpointId || 'temp';

      const imageUrl = await uploadCheckpointImage(gameId, checkpointId, imageFile);
      setUploadingImage(false);
      return imageUrl;
    } catch (err) {
      console.error('Image upload failed:', err);
      setImageError('Nahrání obrázku selhalo. Zkuste to znovu.');
      setUploadingImage(false);
      return null;
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} key={selectedCheckpointId}>
      <Box sx={{ width: { xs: '100vw', sm: 500 }, p: 3 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" color="primary">
            Editovat checkpoint
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={3}>
          {/* Typ checkpointu */}
          <FormControl fullWidth>
            <InputLabel>Typ checkpointu</InputLabel>
            <Select
              value={formData.type || 'info'}
              onChange={(e) => handleChange('type', e.target.value as CheckpointType)}
              label="Typ checkpointu"
            >
              <MenuItem value="info">Info - Pouze informace</MenuItem>
              <MenuItem value="puzzle">Puzzle - Hádanka</MenuItem>
              <MenuItem value="input">Input - Zadání souřadnic</MenuItem>
            </Select>
          </FormControl>

          {/* Název */}
          <TextField
            label="Název checkpointu"
            value={formData.content?.title || ''}
            onChange={(e) => handleContentChange('title', e.target.value)}
            required
            fullWidth
          />

          {/* Popis */}
          <TextField
            label="Popis / Úkol"
            value={formData.content?.description || ''}
            onChange={(e) => handleContentChange('description', e.target.value)}
            multiline
            rows={4}
            fullWidth
            helperText="Co má hráč udělat na tomto checkpointu?"
          />

          {/* Nápověda */}
          <TextField
            label="Nápověda"
            value={formData.content?.clue || ''}
            onChange={(e) => handleContentChange('clue', e.target.value)}
            multiline
            rows={2}
            fullWidth
            helperText="Volitelná nápověda pro hráče"
          />

          {/* Puzzle Answer - pouze pro typ 'puzzle' */}
          {formData.type === 'puzzle' && (
            <TextField
              label="Správná odpověď"
              value={formData.content?.puzzle_answer || ''}
              onChange={(e) => handleContentChange('puzzle_answer', e.target.value)}
              fullWidth
              required
              helperText="Odpověď, kterou musí hráč zadat (case-insensitive)"
            />
          )}

          {/* Radius */}
          <TextField
            label="Radius detekce (m)"
            type="number"
            value={formData.radius || 10}
            onChange={(e) => handleChange('radius', Number(e.target.value))}
            inputProps={{ min: 5, max: 100 }}
            helperText="Jak blízko musí hráč být (5-100m)"
          />

          {/* Is Fake Checkpoint */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_fake || false}
                onChange={(e) => handleChange('is_fake', e.target.checked)}
              />
            }
            label="Falešný checkpoint (nebude se počítat k dokončení hry)"
          />

          {/* Obrázek */}
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <ImageIcon color="primary" />
                  <Typography variant="subtitle2" color="primary">
                    Obrázek checkpointu
                  </Typography>
                </Stack>

                {imageError && (
                  <Alert severity="error" onClose={() => setImageError(null)}>
                    {imageError}
                  </Alert>
                )}

                {imagePreview && (
                  <Box>
                    <CardMedia
                      component="img"
                      image={imagePreview}
                      alt="Preview"
                      sx={{
                        borderRadius: 2,
                        maxHeight: 200,
                        objectFit: 'cover',
                        width: '100%',
                      }}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={handleImageDelete}
                      sx={{ mt: 1 }}
                      fullWidth
                    >
                      Odstranit obrázek
                    </Button>
                  </Box>
                )}

                {!imagePreview && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<ImageIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      fullWidth
                    >
                      Vybrat obrázek
                    </Button>
                  </>
                )}

                <Typography variant="caption" color="text.secondary">
                  Doporučená velikost: 800x600px, max 5MB
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Divider />

          {/* Secret Solution (pouze pro typ 'input') */}
          {formData.type === 'input' && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={hasSecretSolution}
                    onChange={(e) => handleToggleSecretSolution(e.target.checked)}
                  />
                }
                label="Přidat tajné řešení (souřadnice dalšího bodu)"
              />

              {hasSecretSolution && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      Tajné řešení (DMS formát)
                    </Typography>

                    {/* Latitude */}
                    <Typography variant="caption" display="block" mb={1} mt={2}>
                      Zeměpisná šířka (Latitude)
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Stupně"
                        type="number"
                        size="small"
                        value={formData.secret_solution?.latitude.degrees || 0}
                        onChange={(e) =>
                          handleSecretSolutionChange('latitude', 'degrees', Number(e.target.value))
                        }
                        inputProps={{ min: 0, max: 90 }}
                      />
                      <TextField
                        label="Minuty"
                        type="number"
                        size="small"
                        value={formData.secret_solution?.latitude.minutes || 0}
                        onChange={(e) =>
                          handleSecretSolutionChange('latitude', 'minutes', Number(e.target.value))
                        }
                        inputProps={{ min: 0, max: 59 }}
                      />
                      <TextField
                        label="Vteřiny"
                        type="number"
                        size="small"
                        value={formData.secret_solution?.latitude.seconds || 0}
                        onChange={(e) =>
                          handleSecretSolutionChange('latitude', 'seconds', Number(e.target.value))
                        }
                        inputProps={{ min: 0, max: 59 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <InputLabel>Směr</InputLabel>
                        <Select
                          value={formData.secret_solution?.latitude.direction || 'N'}
                          onChange={(e) =>
                            handleSecretSolutionChange('latitude', 'direction', e.target.value)
                          }
                          label="Směr"
                        >
                          <MenuItem value="N">N</MenuItem>
                          <MenuItem value="S">S</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>

                    {/* Longitude */}
                    <Typography variant="caption" display="block" mb={1} mt={2}>
                      Zeměpisná délka (Longitude)
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Stupně"
                        type="number"
                        size="small"
                        value={formData.secret_solution?.longitude.degrees || 0}
                        onChange={(e) =>
                          handleSecretSolutionChange('longitude', 'degrees', Number(e.target.value))
                        }
                        inputProps={{ min: 0, max: 180 }}
                      />
                      <TextField
                        label="Minuty"
                        type="number"
                        size="small"
                        value={formData.secret_solution?.longitude.minutes || 0}
                        onChange={(e) =>
                          handleSecretSolutionChange('longitude', 'minutes', Number(e.target.value))
                        }
                        inputProps={{ min: 0, max: 59 }}
                      />
                      <TextField
                        label="Vteřiny"
                        type="number"
                        size="small"
                        value={formData.secret_solution?.longitude.seconds || 0}
                        onChange={(e) =>
                          handleSecretSolutionChange('longitude', 'seconds', Number(e.target.value))
                        }
                        inputProps={{ min: 0, max: 59 }}
                      />
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <InputLabel>Směr</InputLabel>
                        <Select
                          value={formData.secret_solution?.longitude.direction || 'E'}
                          onChange={(e) =>
                            handleSecretSolutionChange('longitude', 'direction', e.target.value)
                          }
                          label="Směr"
                        >
                          <MenuItem value="E">E</MenuItem>
                          <MenuItem value="W">W</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Action buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button variant="outlined" onClick={onClose}>
              Zrušit
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={uploadingImage}
            >
              {uploadingImage ? 'Nahrávání...' : 'Uložit'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}

// Helper pro výchozí DMS hodnoty
function defaultDMS(direction: 'N' | 'S' | 'E' | 'W'): CoordinateDMS {
  return {
    degrees: 0,
    minutes: 0,
    seconds: 0,
    direction,
  };
}
