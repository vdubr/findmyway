// Custom hook pro sledování orientace zařízení (kompas)
import { useCallback, useEffect, useRef, useState } from 'react';

// iOS Safari specifické rozšíření DeviceOrientationEvent
interface DeviceOrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

// iOS 13+ static metoda pro žádost o povolení orientace
interface DeviceOrientationEventIOSStatic {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

// Minimální změna azimutu, na kterou se reaguje – bez ní by se mapa překreslovala ~60× za sekundu
const HEADING_CHANGE_THRESHOLD = 2;

// Chrome na Androidu posílá v 'deviceorientation' relativní alpha (vůči orientaci při startu),
// absolutní azimut vůči severu je jen v 'deviceorientationabsolute'
const ABSOLUTE_EVENT = 'deviceorientationabsolute';

function angleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

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
  const lastHeadingRef = useRef<number | null>(null);

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
    const iosEvent = event as DeviceOrientationEventIOS;
    let nextHeading: number;

    if (typeof iosEvent.webkitCompassHeading === 'number') {
      // iOS Safari: přímo azimut od severu; záporná hodnota = nekalibrovaný kompas
      if (iosEvent.webkitCompassHeading < 0) return;
      nextHeading = iosEvent.webkitCompassHeading;
    } else if (event.absolute && event.alpha !== null) {
      // Absolutní alpha roste proti směru hodinových ručiček, proto 360 - alpha
      nextHeading = (360 - event.alpha) % 360;
    } else {
      // Relativní alpha neukazuje k severu – raději žádný směr než špatný
      return;
    }

    const lastHeading = lastHeadingRef.current;
    if (lastHeading !== null && angleDiff(nextHeading, lastHeading) < HEADING_CHANGE_THRESHOLD) {
      return;
    }
    lastHeadingRef.current = nextHeading;
    setHeading(nextHeading);
    setError(null);
  }, []);

  const addOrientationListener = useCallback(() => {
    // Duplicitní registrace stejné funkce prohlížeč ignoruje.
    // Přes Reflect.has, protože operátor `in` by zúžil typ window na never
    if (Reflect.has(window, `on${ABSOLUTE_EVENT}`)) {
      window.addEventListener(ABSOLUTE_EVENT, handleOrientation, true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Device Orientation API není podporováno.');
      return;
    }

    try {
      // iOS 13+ vyžaduje explicitní povolení
      const iosStatic = DeviceOrientationEvent as unknown as DeviceOrientationEventIOSStatic;
      if (typeof iosStatic.requestPermission === 'function') {
        const permission = await iosStatic.requestPermission();
        if (permission === 'granted') {
          addOrientationListener();
        } else {
          setError('Přístup k orientaci zařízení byl zamítnut.');
        }
      } else {
        // Android a starší iOS nepotřebují povolení
        addOrientationListener();
      }
    } catch (err) {
      console.error('Device orientation permission error:', err);
      setError(err instanceof Error ? err.message : 'Chyba při získávání orientace');
    }
  }, [isSupported, addOrientationListener]);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener(ABSOLUTE_EVENT, handleOrientation, true);
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
