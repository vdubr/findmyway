// Liška se vzkazem – společný vzhled pro načítání, chyby a prázdné stavy
import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { type FoxState, foxImages } from './FoxGuide';

interface FoxMessageProps {
  fox: FoxState;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  bob?: boolean; // jemné pohupování (načítání)
  role?: 'status' | 'alert';
  minHeight?: string | number;
}

export default function FoxMessage({
  fox,
  title,
  message,
  action,
  bob = false,
  role,
  minHeight = '50vh',
}: FoxMessageProps) {
  return (
    <Stack
      role={role}
      aria-live={role === 'status' ? 'polite' : undefined}
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{ minHeight, px: 3, py: 4, textAlign: 'center' }}
    >
      <Box
        component="img"
        src={foxImages[fox]}
        alt=""
        sx={{
          width: 140,
          height: 140,
          objectFit: 'contain',
          ...(bob && {
            '@keyframes foxBob': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-8px)' },
            },
            animation: 'foxBob 1.6s ease-in-out infinite',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }),
        }}
      />
      <Typography variant="h4" component="p">
        {title}
      </Typography>
      {message && (
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
          {message}
        </Typography>
      )}
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );
}
