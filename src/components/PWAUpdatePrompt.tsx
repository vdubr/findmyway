// Komponenta pro zobrazeni notifikace o dostupne aktualizaci PWA

import { useRegisterSW } from 'virtual:pwa-register/react';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Alert, Box, Button, IconButton, Slide, type SlideProps, Snackbar } from '@mui/material';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Kontrola aktualizaci kazdou hodinu
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      }
      console.log('Service Worker registrovan:', swUrl);
    },
    onRegisterError(error) {
      console.error('Chyba pri registraci Service Workeru:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionComponent={SlideTransition}
      sx={{ bottom: { xs: 80, sm: 24 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'secondary.main',
          color: 'secondary.contrastText',
          '& .MuiAlert-message': {
            flex: 1,
          },
          '& .MuiAlert-icon': {
            color: 'inherit',
          },
        }}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleUpdate}
              startIcon={<RefreshIcon />}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              Aktualizovat
            </Button>
            <IconButton size="small" aria-label="zavrit" color="inherit" onClick={handleDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        Nova verze je dostupna!
      </Alert>
    </Snackbar>
  );
}
