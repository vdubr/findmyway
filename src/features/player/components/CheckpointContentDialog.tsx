// Komponenta pro zobrazení obsahu checkpointu
// Fáze 1: přehrání odměnového videa lišky
// Fáze 2: obsah checkpointu (info/puzzle/input) + tlačítko Pokračovat

import { CheckCircle as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
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
import { useEffect, useState } from 'react';
import foxWaypointVideo from '../../../assets/fox/liska_waypoint.mp4';
import type { Checkpoint, CoordinateDMS } from '../../../types';
import { validateCoordinateInput } from '../../../utils/coordinateValidation';
import CoordinatePicker from './CoordinatePicker';

interface CheckpointContentDialogProps {
  open: boolean;
  checkpoint: Checkpoint;
  checkpointIndex?: number;
  totalCheckpoints?: number;
  onClose: () => void;
  onComplete: () => void;
  canSkip?: boolean;
  onSkip?: () => void;
}

type Phase = 'video' | 'content';

export default function CheckpointContentDialog({
  open,
  checkpoint,
  checkpointIndex,
  totalCheckpoints,
  onClose,
  onComplete,
  canSkip = false,
  onSkip,
}: CheckpointContentDialogProps) {
  const [phase, setPhase] = useState<Phase>('video');

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
  const [missingConfigError, setMissingConfigError] = useState(false);

  // Reset stavu při změně checkpointu nebo otevření
  useEffect(() => {
    if (open) {
      setPhase('video');
      setValidationResult(null);
      setPuzzleAnswer('');
      setMissingConfigError(false);
    }
  }, [open, checkpoint.id]);

  const handleVideoEnd = () => {
    setPhase('content');
  };

  const handlePuzzleSubmit = () => {
    if (!checkpoint.content.puzzle_answer) {
      setMissingConfigError(true);
      return;
    }
    setMissingConfigError(false);
    setIsSubmitting(true);

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

    if (isCorrect) {
      onComplete();
    }
  };

  const handleCoordinateSubmit = () => {
    if (!checkpoint.secret_solution) {
      setMissingConfigError(true);
      return;
    }
    setMissingConfigError(false);
    setIsSubmitting(true);

    const result = validateCoordinateInput(
      inputLatitude,
      inputLongitude,
      checkpoint.secret_solution,
      1
    );

    setValidationResult(result);
    setIsSubmitting(false);

    if (result.isValid) {
      onComplete();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      sx={{ zIndex: 1400 }}
      PaperProps={{
        sx: phase === 'video' ? { bgcolor: 'black', overflow: 'hidden' } : {},
      }}
    >
      {/* Fáze 1: Odměnové video */}
      {phase === 'video' && (
        <DialogContent sx={{ p: 0 }}>
          <video
            src={foxWaypointVideo}
            autoPlay
            playsInline
            onEnded={handleVideoEnd}
            onClick={handleVideoEnd}
            style={{ width: '100%', display: 'block', cursor: 'pointer' }}
          />
        </DialogContent>
      )}

      {/* Fáze 2: Obsah checkpointu */}
      {phase === 'content' && (
        <>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack>
                {checkpointIndex !== undefined && totalCheckpoints !== undefined && (
                  <Typography variant="caption" color="text.secondary">
                    Checkpoint {checkpointIndex + 1} / {totalCheckpoints}
                  </Typography>
                )}
                <Typography variant="h5" color="primary">
                  {checkpoint.content.title || `Checkpoint ${(checkpointIndex ?? 0) + 1}`}
                </Typography>
              </Stack>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>

          <DialogContent>
            <Stack spacing={3}>
              {/* Image */}
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

              {/* Info typ */}
              {checkpoint.type === 'info' && (
                <Typography variant="body2" color="text.secondary">
                  Klikněte na "Pokračovat" pro přechod na další checkpoint.
                </Typography>
              )}

              {/* Puzzle typ */}
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

              {/* Input typ (souřadnice) */}
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

              {/* Chybí konfigurace */}
              {missingConfigError && (
                <Alert severity="error">
                  Tento checkpoint není správně nakonfigurován. Kontaktujte organizátora hry.
                </Alert>
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
        </>
      )}
    </Dialog>
  );
}
