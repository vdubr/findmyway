// Komponenta pro zobrazení obsahu checkpointu
// Fáze 1: přehrání odměnového videa lišky
// Fáze 2: obsah checkpointu (info/puzzle/input) + tlačítko Pokračovat

import {
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  LightbulbOutlined as HintIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import foxWaypointVideo from '../../../assets/fox/liska_waypoint.mp4';
import { bottomSheetDialogSx } from '../../../components/bottomSheetSx';
import Confetti from '../../../components/Confetti';
import type { Checkpoint, CoordinateDMS } from '../../../types';
import { verifyCoordinates, verifyPuzzleAnswer } from '../../../utils/answerCheck';
import { CHECKPOINT_COMPLETE_DELAY } from '../../../utils/constants';
import CoordinatePicker from './CoordinatePicker';

interface CheckpointContentDialogProps {
  open: boolean;
  checkpoint: Checkpoint;
  checkpointIndex?: number;
  totalCheckpoints?: number;
  onClose: () => void;
  onComplete: (checkpointId: string) => void;
  canSkip?: boolean;
  onSkip?: (checkpointId: string) => void;
}

type Phase = 'video' | 'content';

interface ValidationResult {
  isValid: boolean;
  message: string;
}

// Výsledek odpovědi: úspěch jako oslava s konfetami, chyba jako povzbuzení
function AnswerFeedback({ result }: { result: ValidationResult }) {
  useEffect(() => {
    if (result.isValid) navigator.vibrate?.([80, 60, 80]);
  }, [result.isValid]);

  if (!result.isValid) {
    return (
      <Alert severity="error" sx={{ fontWeight: 600 }}>
        {result.message}
      </Alert>
    );
  }

  return (
    <Box
      role="status"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'success.light',
        border: 3,
        borderColor: 'success.main',
        borderRadius: '20px',
        px: 2,
        py: 2.5,
        textAlign: 'center',
      }}
    >
      <Confetti />
      <CheckIcon sx={{ fontSize: 48, color: 'success.main' }} />
      <Typography variant="h4" component="p">
        {result.message}
      </Typography>
    </Box>
  );
}

export default function CheckpointContentDialog({
  open,
  checkpoint: checkpointProp,
  checkpointIndex,
  totalCheckpoints,
  onClose,
  onComplete,
  canSkip = false,
  onSkip,
}: CheckpointContentDialogProps) {
  // Kdo má v systému omezené animace, video přeskočí rovnou
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const initialPhase: Phase = reducedMotion ? 'content' : 'video';
  const [phase, setPhase] = useState<Phase>(initialPhase);

  // Během zavírací animace držet obsah původního checkpointu – rodič už mezitím
  // přepnul na další bod a ten se nesmí na chvíli ukázat (spoiler)
  const [checkpoint, setShownCheckpoint] = useState(checkpointProp);
  if (open && checkpoint !== checkpointProp) {
    setShownCheckpoint(checkpointProp);
  }

  // Po správné odpovědi chvíli ukázat potvrzení, teprve pak pokračovat
  const completeTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (completeTimerRef.current !== null) window.clearTimeout(completeTimerRef.current);
    };
  }, []);

  const completeAfterDelay = () => {
    const completedId = checkpoint.id;
    if (completeTimerRef.current !== null) window.clearTimeout(completeTimerRef.current);
    completeTimerRef.current = window.setTimeout(() => {
      completeTimerRef.current = null;
      onComplete(completedId);
    }, CHECKPOINT_COMPLETE_DELAY);
  };

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

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [missingConfigError, setMissingConfigError] = useState(false);

  // Reset stavu při změně checkpointu nebo otevření
  const checkpointId = checkpoint.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: checkpointId je záměrná závislost - reset stavu při změně checkpointu
  useEffect(() => {
    if (open) {
      setPhase(initialPhase);
      setValidationResult(null);
      setPuzzleAnswer('');
      setMissingConfigError(false);
    }
  }, [open, checkpointId]);

  const handleVideoEnd = () => {
    setPhase('content');
  };

  // Odpovědi se ověřují proti SHA-256 hashům – řešení v plaintextu klient nemá
  const handlePuzzleSubmit = async () => {
    if (!checkpoint.answer_hash) {
      setMissingConfigError(true);
      return;
    }
    setMissingConfigError(false);
    setIsSubmitting(true);

    const isCorrect = await verifyPuzzleAnswer(puzzleAnswer, checkpoint.answer_hash);

    setValidationResult({
      isValid: isCorrect,
      message: isCorrect ? 'Přesně tak! Hádanka je za tebou.' : 'Skoro! Zkus to ještě jednou.',
    });

    setIsSubmitting(false);

    if (isCorrect) {
      completeAfterDelay();
    }
  };

  const handleCoordinateSubmit = async () => {
    if (!checkpoint.solution_lat_hash || !checkpoint.solution_lng_hash) {
      setMissingConfigError(true);
      return;
    }
    setMissingConfigError(false);
    setIsSubmitting(true);

    const result = await verifyCoordinates(
      inputLatitude,
      inputLongitude,
      checkpoint.solution_lat_hash,
      checkpoint.solution_lng_hash,
      1
    );

    setValidationResult(result);
    setIsSubmitting(false);

    if (result.isValid) {
      completeAfterDelay();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      sx={{ zIndex: 1400, ...bottomSheetDialogSx }}
      PaperProps={{
        sx: phase === 'video' ? { bgcolor: 'black', overflow: 'hidden' } : {},
      }}
    >
      {/* Fáze 1: Odměnové video */}
      {phase === 'video' && (
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <video
            src={foxWaypointVideo}
            autoPlay
            playsInline
            onEnded={handleVideoEnd}
            onClick={handleVideoEnd}
            style={{ width: '100%', display: 'block', cursor: 'pointer' }}
          />
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleVideoEnd}
            sx={{ position: 'absolute', right: 12, bottom: 16 }}
          >
            Přeskočit video
          </Button>
        </DialogContent>
      )}

      {/* Fáze 2: Obsah checkpointu */}
      {phase === 'content' && (
        <>
          <DialogTitle>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack spacing={0.5} alignItems="flex-start">
                {checkpointIndex !== undefined && totalCheckpoints !== undefined && (
                  <Chip
                    label={`Bod ${checkpointIndex + 1} z ${totalCheckpoints}`}
                    size="small"
                    sx={{ bgcolor: '#E4F3E8', color: 'text.primary' }}
                  />
                )}
                <Typography variant="h4" component="h2">
                  {checkpoint.content.title || `Bod ${(checkpointIndex ?? 0) + 1}`}
                </Typography>
              </Stack>
              <IconButton onClick={onClose} aria-label="Zavřít">
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
                <Card variant="outlined" sx={{ bgcolor: 'warning.light', border: 0 }}>
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      color="warning.dark"
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 700 }}
                    >
                      <HintIcon fontSize="small" aria-hidden />
                      Nápověda
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#5C3A00' }}>
                      {checkpoint.content.clue}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Info typ */}
              {checkpoint.type === 'info' && (
                <Typography variant="body2" color="text.secondary">
                  Klepni na „Pokračovat“ a vyraz k dalšímu bodu.
                </Typography>
              )}

              {/* Puzzle typ */}
              {checkpoint.type === 'puzzle' && (
                <>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Vyřeš hádanku a napiš odpověď.
                      </Typography>
                    </CardContent>
                  </Card>

                  <TextField
                    fullWidth
                    label="Tvoje odpověď"
                    value={puzzleAnswer}
                    onChange={(e) => setPuzzleAnswer(e.target.value)}
                    placeholder="Napiš, co si myslíš"
                    variant="outlined"
                    autoComplete="off"
                    disabled={isSubmitting || (validationResult?.isValid ?? false)}
                  />

                  {validationResult && <AnswerFeedback result={validationResult} />}
                </>
              )}

              {/* Input typ (souřadnice) */}
              {checkpoint.type === 'input' && (
                <>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Zadej GPS souřadnice dalšího bodu ve formátu DMS (stupně, minuty, sekundy).
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tip: každou hodnotu nastavíš posuvníkem níže.
                      </Typography>
                    </CardContent>
                  </Card>

                  <CoordinatePicker
                    latitude={inputLatitude}
                    longitude={inputLongitude}
                    onLatitudeChange={setInputLatitude}
                    onLongitudeChange={setInputLongitude}
                  />

                  {validationResult && <AnswerFeedback result={validationResult} />}
                </>
              )}

              {/* Chybí konfigurace */}
              {missingConfigError && (
                <Alert severity="error">
                  Tenhle bod ještě není úplně hotový. Napiš o tom tvůrci hry.
                </Alert>
              )}

              {/* Action buttons */}
              <Stack direction="row" spacing={1} alignItems="center">
                {canSkip && onSkip && (
                  <Button
                    variant="text"
                    onClick={() => onSkip(checkpoint.id)}
                    sx={{ flexShrink: 0, px: 1.5 }}
                  >
                    Přeskočit úkol
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={
                    checkpoint.type === 'input'
                      ? handleCoordinateSubmit
                      : checkpoint.type === 'puzzle'
                        ? handlePuzzleSubmit
                        : () => onComplete(checkpoint.id)
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
