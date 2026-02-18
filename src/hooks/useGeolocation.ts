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
        errorMessage = 'Informace o poloze nejsou dostupné.';
        break;
      case err.TIMEOUT:
        errorMessage = 'Vypršel časový limit pro získání polohy.';
        break;
    }

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

      // First request position to trigger permission prompt
      // Use longer timeout and allow lower accuracy for desktop
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('Geolocation permission granted, position received:', pos);
          handleSuccess(pos);

          // After successful permission, start watching position
          const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: false, // Desktop má obvykle jen WiFi/IP geolocation
            timeout: 10000, // 10 sekund timeout
            maximumAge: 30000, // Cache na 30 sekund je OK
          });

          setWatchId(id);
        },
        (err) => {
          console.error('Geolocation error:', err);
          handleError(err);
        },
        {
          enableHighAccuracy: false, // Desktop obvykle nemá GPS
          timeout: 10000, // Delší timeout pro desktop
          maximumAge: 0,
        }
      );
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
