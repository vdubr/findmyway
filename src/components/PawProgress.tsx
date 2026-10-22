// Postup hrou jako řada tlapek (hotové plné, aktuální zvýrazněná, zbylé světlé).
// U dlouhých her by se tlapky nevešly – tam zůstává klasický pruh.
import { Pets as PawIcon } from '@mui/icons-material';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';

interface PawProgressProps {
  current: number; // pořadí aktuálního bodu (od 0)
  total: number;
  currentDone?: boolean; // aktuální bod už je dosažený
}

const MAX_PAWS = 10;

export default function PawProgress({ current, total, currentDone = false }: PawProgressProps) {
  const done = current + (currentDone ? 1 : 0);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      role="img"
      aria-label={`Bod ${current + 1} z ${total}`}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 999,
        px: 2,
        py: 0.75,
        boxShadow: '0 4px 12px rgba(14, 42, 28, 0.15)',
        alignSelf: 'center',
        maxWidth: '100%',
      }}
    >
      {total <= MAX_PAWS ? (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {Array.from({ length: total }, (_, i) => {
            const isDone = i < done;
            const isCurrent = i === current && !currentDone;
            return (
              <PawIcon
                key={i}
                sx={{
                  fontSize: 22,
                  color: isDone || isCurrent ? 'primary.main' : '#B5D3C0',
                  opacity: isCurrent ? 0.55 : 1,
                  transform: isCurrent ? 'scale(1.15)' : 'none',
                }}
              />
            );
          })}
        </Box>
      ) : (
        <LinearProgress
          variant="determinate"
          value={(done / total) * 100}
          sx={{ width: 160, height: 8, borderRadius: 4 }}
        />
      )}
      <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
        {current + 1} / {total}
      </Typography>
    </Stack>
  );
}
