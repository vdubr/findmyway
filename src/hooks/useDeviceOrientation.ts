// Custom hook pro sledování orientace zařízení (kompas)
import { useCallback, useEffect, useState } from 'react';

interface UseDeviceOrientationReturn {
  heading: number | null; // Azimut v stupních (0-360, 0 = sever)
  error: string | null;
  isSupported: boolean;
  requestPermission: () => Promise<void>;
}

export function useDeviceOrientation(): UseDeviceOrientationReturn {
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Zkontrolovat podporu Device Orientation API
    if ('DeviceOrientationEvent' in window) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setError('Váš prohlížeč nepodporuje Device Orientation API.');
    }
  }, []);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Alpha = kompas (0-360 stupňů)
    // Normalizovat hodnotu (některé prohlížeče vrací null)
    if (event.alpha !== null) {
      // Alpha je úhel rotace kolem osy Z (kompas)
      // 0° = sever, 90° = východ, 180° = jih, 270° = západ
      const alpha = event.alpha;

      // Pokud je k dispozici webkitCompassHeading (iOS Safari), použít to
      const webkitEvent = event as any;
      if (webkitEvent.webkitCompassHeading !== undefined) {
        // webkitCompassHeading je přesnější na iOS
        setHeading(webkitEvent.webkitCompassHeading);
      } else {
        // Na Androidu použít alpha, ale převrátit (360 - alpha)
        // protože alpha roste proti směru hodinových ručiček
        setHeading(360 - alpha);
      }

      setError(null);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Device Orientation API není podporováno.');
      return;
    }

    try {
      // iOS 13+ vyžaduje explicitní povolení
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        } else {
          setError('Přístup k orientaci zařízení byl zamítnut.');
        }
      } else {
        // Android a starší iOS nepotřebují povolení
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    } catch (err) {
      console.error('Device orientation permission error:', err);
      setError(err instanceof Error ? err.message : 'Chyba při získávání orientace');
    }
  }, [isSupported, handleOrientation]);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [handleOrientation]);

  return {
    heading,
    error,
    isSupported,
    requestPermission,
  };
}
