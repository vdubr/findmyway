// Komponenta pro zobrazení obsahu checkpointu

import { CheckCircle as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { Checkpoint, CoordinateDMS } from '../../../types';
import { validateCoordinateInput } from '../../../utils/coordinateValidation';
import CoordinatePicker from './CoordinatePicker';

interface CheckpointContentDialogProps {
  open: boolean;
  checkpoint: Checkpoint;
  onClose: () => void;
  onComplete: () => void;
  canSkip?: boolean;
  onSkip?: () => void;
}

export default function CheckpointContentDialog({
  open,
  checkpoint,
  onClose,
  onComplete,
  canSkip = false,
  onSkip,
}: CheckpointContentDialogProps) {
  // State pro coordinate input
  const [inputLatitude, setInputLatitude] = useState<CoordinateDMS>({
    degrees: 50,
    minutes: 0,
    seconds: 0,
    direction: 'N',
  });

  const [inputLongitude, setInputLongitude] = useState<CoordinateDMS>({
    degrees: 14,
    minutes: 0,
    seconds: 0,
    direction: 'E',
  });

  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [puzzleAnswer, setPuzzleAnswer] = useState('');

  const handlePuzzleSubmit = () => {
    if (!checkpoint.content.puzzle_answer) {
      console.error('No puzzle answer defined for this checkpoint');
      return;
    }

    setIsSubmitting(true);

    // Porovnání odpovědi (case-insensitive)
    const correctAnswer = checkpoint.content.puzzle_answer.toLowerCase().trim();
    const userAnswer = puzzleAnswer.toLowerCase().trim();

    const isCorrect = userAnswer === correctAnswer;

    setValidationResult({
      isValid: isCorrect,
      message: isCorrect
        ? '🎉 Správně! Vyřešili jste hádanku.'
        : '❌ Nesprávná odpověď. Zkuste to znovu.',
    });

    setIsSubmitting(false);

    // Pokud je správná odpověď, po 2 sekundách pokračujeme
    if (isCorrect) {
      setTimeout(() => {
        setValidationResult(null);
        setPuzzleAnswer('');
        onComplete();
      }, 2000);
    }
  };

  const handleCoordinateSubmit = () => {
    if (!checkpoint.secret_solution) {
      console.error('No secret solution defined for this checkpoint');
      return;
    }

    setIsSubmitting(true);

    // Validace
    const result = validateCoordinateInput(
      inputLatitude,
      inputLongitude,
      checkpoint.secret_solution,
      1 // tolerance 1 sekunda
    );

    setValidationResult(result);
    setIsSubmitting(false);

    // Pokud je validace úspěšná, po 2 sekundách zavřeme dialog a pokračujeme
    if (result.isValid) {
      setTimeout(() => {
        setValidationResult(null);
        onComplete();
      }, 2000);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" color="primary">
            {checkpoint.content.title}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Image if available */}
          {checkpoint.content.image_url && (
            <CardMedia
              component="img"
              image={checkpoint.content.image_url}
              alt={checkpoint.content.title}
              sx={{ borderRadius: 2, maxHeight: 300, objectFit: 'cover' }}
            />
          )}

          {/* Description */}
          {checkpoint.content.description && (
            <Typography variant="body1">{checkpoint.content.description}</Typography>
          )}

          {/* Clue */}
          {checkpoint.content.clue && (
            <Card variant="outlined" sx={{ bgcolor: 'info.light' }}>
              <CardContent>
                <Typography variant="subtitle2" color="info.dark" gutterBottom>
                  💡 Nápověda:
                </Typography>
                <Typography variant="body2" color="info.dark">
                  {checkpoint.content.clue}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Type-specific content */}
          {checkpoint.type === 'info' && (
            <Typography variant="body2" color="text.secondary">
              Klikněte na "Pokračovat" pro přechod na další checkpoint.
            </Typography>
          )}

          {checkpoint.type === 'puzzle' && (
            <>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Vyřešte hádanku a zadejte odpověď.
                  </Typography>
                </CardContent>
              </Card>

              <TextField
                fullWidth
                label="Vaše odpověď"
                value={puzzleAnswer}
                onChange={(e) => setPuzzleAnswer(e.target.value)}
                placeholder="Zadejte odpověď..."
                variant="outlined"
                autoComplete="off"
                disabled={isSubmitting || (validationResult?.isValid ?? false)}
              />

              {validationResult && (
                <Alert
                  severity={validationResult.isValid ? 'success' : 'error'}
                  sx={{
                    animation: 'fadeIn 0.3s ease-in',
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(-10px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                  }}
                >
                  {validationResult.message}
                </Alert>
              )}
            </>
          )}

          {checkpoint.type === 'input' && (
            <>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Zadejte GPS souřadnice dalšího checkpointu ve formátu DMS (stupně, minuty,
                    sekundy).
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    💡 Tip: Použijte posuvníky níže pro nastavení každé hodnoty.
                  </Typography>
                </CardContent>
              </Card>

              <CoordinatePicker
                latitude={inputLatitude}
                longitude={inputLongitude}
                onLatitudeChange={setInputLatitude}
                onLongitudeChange={setInputLongitude}
              />

              {validationResult && (
                <Alert
                  severity={validationResult.isValid ? 'success' : 'error'}
                  sx={{
                    animation: 'fadeIn 0.3s ease-in',
                    '@keyframes fadeIn': {
                      from: { opacity: 0, transform: 'translateY(-10px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                  }}
                >
                  {validationResult.message}
                </Alert>
              )}
            </>
          )}

          {/* Action buttons */}
          <Stack direction="row" spacing={2}>
            {canSkip && onSkip && (
              <Button variant="outlined" onClick={onSkip} fullWidth>
                Přeskočit
              </Button>
            )}
            <Button
              variant="contained"
              onClick={
                checkpoint.type === 'input'
                  ? handleCoordinateSubmit
                  : checkpoint.type === 'puzzle'
                    ? handlePuzzleSubmit
                    : onComplete
              }
              startIcon={<CheckIcon />}
              fullWidth
              disabled={isSubmitting || (validationResult?.isValid ?? false)}
            >
              {checkpoint.type === 'info' ? 'Pokračovat' : 'Potvrdit'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
