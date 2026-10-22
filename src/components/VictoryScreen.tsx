// Vítězná obrazovka po dokončení hry – přes celou plochu, s konfetami, statistikami a sdílením.
// Sdílí ji hra (PlayerPage) i náhled hry v editoru (DemoPlayer).
import { IosShare as ShareIcon } from '@mui/icons-material';
import { Box, Button, Dialog, Stack, Typography } from '@mui/material';
import foxTreasure from '../assets/fox/liska_nasla_poklad.webp';
import { brandColors } from '../theme';
import { formatDuration, pluralCs } from '../utils/format';
import { formatDistance } from '../utils/geo';
import Confetti from './Confetti';

interface VictoryScreenProps {
  open: boolean;
  gameTitle: string;
  completed: number; // splněné body (bez přeskočených)
  total: number;
  routeDistance?: number; // délka trasy v metrech
  durationMs?: number | null; // jak dlouho hra trvala
  note?: string; // doplňující věta (např. u náhledu v editoru)
  shareUrl?: string; // když je, nabídne se sdílení výsledku
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: '#1E4432',
        borderRadius: '18px',
        py: 1.5,
        px: 0.5,
        textAlign: 'center',
      }}
    >
      <Typography variant="h3" component="p" sx={{ color: '#fff' }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: '#AEDFC3' }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function VictoryScreen({
  open,
  gameTitle,
  completed,
  total,
  routeDistance,
  durationMs,
  note,
  shareUrl,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: VictoryScreenProps) {
  const canShare = Boolean(shareUrl) && typeof navigator !== 'undefined' && 'share' in navigator;

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({
        title: 'FindMyWay',
        text: `Našel/našla jsem poklad ve hře „${gameTitle}“ – ${completed} ${pluralCs(completed, 'bod', 'body', 'bodů')}${durationMs ? ` za ${formatDuration(durationMs)}` : ''}.`,
        url: shareUrl,
      });
    } catch {
      // Zavřený sdílecí dialog není chyba
    }
  };

  return (
    <Dialog
      open={open}
      fullScreen
      PaperProps={{
        sx: { bgcolor: brandColors.forestDark, color: '#fff', borderRadius: 0 },
      }}
    >
      <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {open && <Confetti pieces={28} duration={1800} />}
        <Stack
          spacing={2}
          alignItems="center"
          sx={{
            position: 'relative',
            flex: 1,
            width: '100%',
            maxWidth: 480,
            mx: 'auto',
            px: 2.5,
            pt: 'calc(32px + env(safe-area-inset-top))',
            pb: 'calc(24px + env(safe-area-inset-bottom))',
            boxSizing: 'border-box',
          }}
        >
          <Box
            sx={{
              width: 210,
              height: 210,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,201,60,0.35) 0%, rgba(255,201,60,0) 70%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src={foxTreasure}
              alt="Liška našla poklad"
              sx={{
                width: 180,
                height: 180,
                objectFit: 'contain',
                '@keyframes foxBounce': {
                  '0%': { transform: 'scale(0.4)', opacity: 0 },
                  '70%': { transform: 'scale(1.08)', opacity: 1 },
                  '100%': { transform: 'scale(1)' },
                },
                animation: 'foxBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            />
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h1" component="h2" sx={{ color: brandColors.sun }}>
              Poklad je tvůj!
            </Typography>
            <Typography variant="body1" sx={{ color: '#EAF6EE', mt: 0.5 }}>
              Zvládl/a jsi hru <strong>„{gameTitle}“</strong>
            </Typography>
            {note && (
              <Typography variant="body2" sx={{ color: '#AEDFC3', mt: 1 }}>
                {note}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
            <Stat value={`${completed}/${total}`} label={pluralCs(total, 'bod', 'body', 'bodů')} />
            {routeDistance !== undefined && (
              <Stat value={formatDistance(routeDistance)} label="trasa" />
            )}
            {durationMs ? <Stat value={formatDuration(durationMs)} label="čas" /> : null}
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Stack spacing={1.5} sx={{ width: '100%' }}>
            {canShare && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                fullWidth
              >
                Sdílet výsledek
              </Button>
            )}
            <Button
              variant={canShare ? 'outlined' : 'contained'}
              color={canShare ? 'inherit' : 'secondary'}
              size="large"
              onClick={onPrimary}
              fullWidth
              sx={canShare ? { borderColor: '#5BC88C', color: '#fff' } : undefined}
            >
              {primaryLabel}
            </Button>
            {secondaryLabel && onSecondary && (
              <Button variant="text" onClick={onSecondary} sx={{ color: '#EAF6EE' }}>
                {secondaryLabel}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Dialog>
  );
}
