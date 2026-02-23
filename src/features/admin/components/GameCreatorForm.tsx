// Formulář pro vytvoření nové hry nebo editaci existující

import { Cancel as CancelIcon, Save as SaveIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { CreateGameInput } from '../../../types';

interface GameCreatorFormProps {
  initialValues?: Partial<CreateGameInput>;
  onSubmit: (gameData: CreateGameInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const DEFAULT_VALUES: CreateGameInput = {
  title: '',
  description: '',
  is_public: true,
  difficulty: 3,
  settings: {
    radius_tolerance: 10,
    allow_skip: false,
    max_players: null,
    time_limit: null,
    share_location_required: false,
  },
};

export default function GameCreatorForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: GameCreatorFormProps) {
  const [formData, setFormData] = useState<CreateGameInput>({
    ...DEFAULT_VALUES,
    ...initialValues,
    settings: {
      ...DEFAULT_VALUES.settings,
      ...initialValues?.settings,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CreateGameInput, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSettingsChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [field]: value },
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Název hry je povinný';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Název musí mít alespoň 3 znaky';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom color="primary">
          Nová hra
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Název hry */}
            <TextField
              label="Název hry"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
              fullWidth
              disabled={isLoading}
            />

            {/* Popis */}
            <TextField
              label="Popis"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              multiline
              rows={3}
              fullWidth
              disabled={isLoading}
              helperText="Stručný popis hry pro hráče"
            />

            {/* Obtížnost */}
            <Box>
              <Typography gutterBottom>Obtížnost: {formData.difficulty}/5</Typography>
              <Slider
                value={formData.difficulty}
                onChange={(_, value) => handleChange('difficulty', value)}
                min={1}
                max={5}
                step={1}
                marks
                disabled={isLoading}
                valueLabelDisplay="auto"
              />
            </Box>

            {/* Veřejná hra */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_public}
                  onChange={(e) => handleChange('is_public', e.target.checked)}
                  disabled={isLoading}
                />
              }
              label="Veřejná hra (viditelná pro všechny)"
            />

            {/* Pokročilá nastavení */}
            <Typography variant="h6" sx={{ mt: 2 }}>
              Pokročilá nastavení
            </Typography>

            {/* Tolerance radiusu */}
            <TextField
              label="Tolerance radiusu (m)"
              type="number"
              value={formData.settings?.radius_tolerance}
              onChange={(e) => handleSettingsChange('radius_tolerance', Number(e.target.value))}
              disabled={isLoading}
              helperText="Jak blízko musí hráč být k checkpointu (výchozí: 10m)"
              inputProps={{ min: 5, max: 100 }}
            />

            {/* Povolit skip */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.allow_skip}
                  onChange={(e) => handleSettingsChange('allow_skip', e.target.checked)}
                  disabled={isLoading}
                />
              }
              label="Povolit přeskočení checkpointu"
            />

            {/* Sdileni polohy */}
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.share_location_required}
                  onChange={(e) =>
                    handleSettingsChange('share_location_required', e.target.checked)
                  }
                  disabled={isLoading}
                />
              }
              label="Vyzadovat sdileni polohy hracu (admin vidi pozice v realnem case)"
            />

            {/* Max hráči */}
            <TextField
              label="Maximální počet hráčů (volitelné)"
              type="number"
              value={formData.settings?.max_players || ''}
              onChange={(e) =>
                handleSettingsChange('max_players', e.target.value ? Number(e.target.value) : null)
              }
              disabled={isLoading}
              helperText="Nechat prázdné pro neomezený počet"
              inputProps={{ min: 1 }}
            />

            {/* Časový limit */}
            <TextField
              label="Časový limit (minuty, volitelné)"
              type="number"
              value={formData.settings?.time_limit || ''}
              onChange={(e) =>
                handleSettingsChange('time_limit', e.target.value ? Number(e.target.value) : null)
              }
              disabled={isLoading}
              helperText="Nechat prázdné pro neomezený čas"
              inputProps={{ min: 5 }}
            />

            {/* Action buttons */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={isLoading}
                  startIcon={<CancelIcon />}
                >
                  Zrušit
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
                startIcon={<SaveIcon />}
              >
                {isLoading ? 'Ukládám...' : 'Pokračovat na mapu'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
