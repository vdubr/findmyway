// Komponenta pro zobrazení offline indikátoru
import { CloudOff as OfflineIcon } from '@mui/icons-material';
import { Alert, Box, Fade } from '@mui/material';
import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const [showOffline, setShowOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setShowOffline(false);
    };

    const handleOffline = () => {
      setShowOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Fade in={showOffline} timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: 64, // Pod hlavičkou
          left: 0,
          right: 0,
          zIndex: 1200,
          display: showOffline ? 'block' : 'none',
        }}
      >
        <Alert
          severity="warning"
          icon={<OfflineIcon />}
          sx={{
            borderRadius: 0,
            justifyContent: 'center',
            '& .MuiAlert-message': {
              textAlign: 'center',
            },
          }}
        >
          Offline režim - používáte uloženou verzi hry
        </Alert>
      </Box>
    </Fade>
  );
}
