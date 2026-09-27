// Custom hook pro sledování GPS pozice uživatele
import { useCallback, useEffect, useRef, useState } from 'react';
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

  // Ref místo state: cleanup musí znát i watch spuštěný až po posledním renderu
  const watchIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  // Jakmile dorazí fix ze sledování, přibližný jednorázový fix už ho nesmí přepsat
  const hasWatchFixRef = useRef(false);

  const isSupported = 'geolocation' in navigator;

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

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

    setLoading(true);
    setError(null);
    clearWatch();
    hasWatchFixRef.current = false;

    // Rychlý přibližný fix (Wi-Fi/IP), aby hráč nečekal na studený start GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mountedRef.current || hasWatchFixRef.current) return;
        handleSuccess(pos);
      },
      () => {
        // Záměrně ignorováno – chybu (např. zamítnutí přístupu) nahlásí watchPosition
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );

    // Průběžné sledování vždy s vysokou přesností – detekce checkpointů potřebuje GPS,
    // přibližná poloha (desítky až stovky metrů) by radius nikdy spolehlivě netrefila
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;
        hasWatchFixRef.current = true;
        handleSuccess(pos);
      },
      (err) => {
        if (!mountedRef.current) return;
        handleError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
      }
    );
  }, [isSupported, handleSuccess, handleError, clearWatch]);

  // Cleanup watch on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearWatch();
    };
  }, [clearWatch]);

  return {
    position,
    error,
    loading,
    isSupported,
    requestPermission,
  };
}
