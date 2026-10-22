// Krátký výbuch konfet čistě v CSS (bez canvasu) – odměna za vyřešený úkol a dokončenou hru.
// Rodič musí mít position: relative. Při prefers-reduced-motion se nic nezobrazí.
import { Box } from '@mui/material';
import { brandColors } from '../theme';

interface ConfettiProps {
  pieces?: number; // počet kousků
  duration?: number; // délka animace v ms
}

const COLORS = [brandColors.fox, brandColors.sun, brandColors.sky, brandColors.forest, '#FFFFFF'];

export default function Confetti({ pieces = 18, duration = 1400 }: ConfettiProps) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
        '@keyframes confettiFall': {
          '0%': { transform: 'translate3d(0, -20px, 0) rotate(0deg)', opacity: 1 },
          '100%': {
            transform: 'translate3d(var(--drift), 110%, 0) rotate(var(--spin))',
            opacity: 0,
          },
        },
      }}
    >
      {Array.from({ length: pieces }, (_, i) => {
        // Deterministické rozložení – stejné při každém renderu, bez Math.random
        const left = (i * 37) % 100;
        const delay = (i * 53) % 400;
        const round = i % 3 === 0;
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: 0,
              left: `${left}%`,
              width: round ? 10 : 8,
              height: round ? 10 : 14,
              borderRadius: round ? '50%' : '2px',
              bgcolor: COLORS[i % COLORS.length],
              '--drift': `${((i % 5) - 2) * 18}px`,
              '--spin': `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
              animation: `confettiFall ${duration}ms ease-in ${delay}ms forwards`,
              opacity: 0,
            }}
          />
        );
      })}
    </Box>
  );
}
