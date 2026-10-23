// Komponenta pro zobrazeni notifikace o dostupne aktualizaci PWA

import { useRegisterSW } from 'virtual:pwa-register/react';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Alert, Box, Button, IconButton, Slide, type SlideProps, Snackbar } from '@mui/material';

// Pravidelná kontrola nové verze, když je aplikace otevřená
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
// Návrat do popředí může přijít často – kontrolovat nejvýš jednou za minutu
const FOREGROUND_CHECK_THROTTLE = 60 * 1000;

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('Service Worker registrovan:', swUrl);
      if (!registration) return;

      let lastCheck = Date.now();
      const checkForUpdate = () => {
        if (!navigator.onLine) return;
        lastCheck = Date.now();
        registration.update().catch(() => {
          // Chyba sítě není problém – zkusí se při další příležitosti
        });
      };
      setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);

      // Připnutá aplikace se na mobilu většinou jen probouzí z pozadí (bez načtení stránky)
      // a interval je v pozadí uspaný – bez kontroly při návratu by novou verzi nenašla
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        // Nová verze už čeká (lišta byla zavřena křížkem) – nabídnout ji znovu
        if (registration.waiting) setNeedRefresh(true);
        if (Date.now() - lastCheck > FOREGROUND_CHECK_THROTTLE) checkForUpdate();
      });
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
            <IconButton size="small" aria-label="zavřít" color="inherit" onClick={handleDismiss}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        Nová verze je dostupná!
      </Alert>
    </Snackbar>
  );
}
