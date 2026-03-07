// Custom hook pro sledování GPS pozice uživatele
import { useCallback, useEffect, useState } from 'react';
import type { GPSPosition } from '../types';

interface UseGeolocationReturn {
  position: GPSPosition | null;
  error: string | null;
  loading: boolean;
  isSupported: boolean;
  requestPermission: () => Promise<void>;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Start with false, only set to true when requesting permission
  const [watchId, setWatchId] = useState<number | null>(null);

  const isSupported = 'geolocation' in navigator;

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setError(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = 'Neznámá chyba při získávání polohy';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = 'Přístup k poloze byl zamítnut. Povolte přístup k poloze v nastavení.';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = 'Informace o poloze nejsou dostupné. Zkuste to znovu.';
        break;
      case err.TIMEOUT:
        errorMessage = 'Vypršel časový limit pro získání polohy. Zkuste to znovu.';
        break;
    }

    console.error('Geolocation error:', errorMessage, `(code: ${err.code})`);
    setError(errorMessage);
    setLoading(false);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Geolokace není podporována ve vašem prohlížeči.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Requesting geolocation permission...');

      // Nejprve zkusit presnou polohu (GPS), pokud selze, fallback na nizkou presnost (IP)
      const tryGetPosition = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log(
              `Geolocation received (highAccuracy=${highAccuracy}):`,
              pos.coords.accuracy,
              'm'
            );
            handleSuccess(pos);

            // Po uspesnem ziskani pozice spustit sledovani
            const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
              enableHighAccuracy: highAccuracy,
              timeout: 30000,
              maximumAge: 5000,
            });

            setWatchId(id);
          },
          (err) => {
            // Pokud selze presna poloha, zkusit nizkou presnost (IP-based)
            if (highAccuracy) {
              console.warn(
                'High accuracy geolocation failed, falling back to low accuracy:',
                err.message
              );
              tryGetPosition(false);
            } else {
              handleError(err);
            }
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 10000 : 30000, // Kratsi timeout pro GPS, delsi pro IP fallback
            maximumAge: 0,
          }
        );
      };

      tryGetPosition(true);
    } catch (err) {
      console.error('Exception in requestPermission:', err);
      setError(err instanceof Error ? err.message : 'Chyba při získávání polohy');
      setLoading(false);
    }
  }, [isSupported, handleSuccess, handleError]);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    position,
    error,
    loading,
    isSupported,
    requestPermission,
  };
}
