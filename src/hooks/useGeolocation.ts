// Custom hook pro sledování GPS pozice uživatele
import { useCallback, useEffect, useState } from "react";
import type { GPSPosition } from "../types";

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

  const isSupported = "geolocation" in navigator;

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
    let errorMessage = "Neznámá chyba při získávání polohy";

    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage =
          "Přístup k poloze byl zamítnut. Povolte přístup k poloze v nastavení.";
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = "Informace o poloze nejsou dostupné. Zkuste to znovu.";
        break;
      case err.TIMEOUT:
        errorMessage =
          "Vypršel časový limit pro získání polohy. Zkuste to znovu.";
        break;
    }

    console.error("Geolocation error:", errorMessage, `(code: ${err.code})`);
    setError(errorMessage);
    setLoading(false);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError("Geolokace není podporována ve vašem prohlížeči.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("Requesting geolocation permission...");

      // First request position to trigger permission prompt
      // Use high accuracy for GPS-based treasure hunt game
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log(
            "Geolocation permission granted, position received:",
            pos,
          );
          handleSuccess(pos);

          // After successful permission, start watching position
          const id = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
              enableHighAccuracy: true, // Použít GPS pro přesnou polohu
              timeout: 30000, // 30 sekund timeout
              maximumAge: 5000, // Cache jen 5 sekund pro aktuální pozici
            },
          );

          setWatchId(id);
        },
        (err) => {
          handleError(err);
        },
        {
          enableHighAccuracy: true, // Požádat o přesnou GPS polohu
          timeout: 30000, // Delší timeout pro GPS lock
          maximumAge: 0, // Vždy získat novou pozici
        },
      );
    } catch (err) {
      console.error("Exception in requestPermission:", err);
      setError(
        err instanceof Error ? err.message : "Chyba při získávání polohy",
      );
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
