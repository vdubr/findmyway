import type { GeoLocation } from '../types';

/**
 * Výpočet vzdálenosti mezi dvěma GPS souřadnicemi pomocí Haversine vzorce
 * @param point1 První bod (lat, lng)
 * @param point2 Druhý bod (lat, lng)
 * @returns Vzdálenost v metrech
 */
export function calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
  const R = 6371e3; // Poloměr Země v metrech
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Vzdálenost v metrech
}

/**
 * Kontrola, zda je uživatel v rámci povoleného radiusu od checkpointu
 * @param userPosition Aktuální pozice uživatele
 * @param checkpointPosition Pozice checkpointu
 * @param radius Povolený radius v metrech
 * @returns true pokud je uživatel v radiusu
 */
export function isWithinRadius(
  userPosition: GeoLocation,
  checkpointPosition: GeoLocation,
  radius: number
): boolean {
  const distance = calculateDistance(userPosition, checkpointPosition);
  return distance <= radius;
}

/**
 * Formátování vzdálenosti pro zobrazení
 * @param meters Vzdálenost v metrech
 * @returns Formátovaný string (např. "15 m" nebo "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Výpočet azimutu (směru) mezi dvěma body
 * @param from Výchozí bod
 * @param to Cílový bod
 * @returns Azimut ve stupních (0-360, kde 0 je sever)
 */
export function calculateBearing(from: GeoLocation, to: GeoLocation): number {
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Převod desetinných stupňů na DMS (Degrees, Minutes, Seconds)
 * @param decimal Desetinné stupně
 * @param isLatitude true pro zeměpisnou šířku, false pro délku
 * @returns Objekt s degrees, minutes, seconds a direction
 */
export function decimalToDMS(
  decimal: number,
  isLatitude: boolean
): {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
} {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);

  let direction: 'N' | 'S' | 'E' | 'W';
  if (isLatitude) {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }

  return { degrees, minutes, seconds, direction };
}

/**
 * Převod DMS (Degrees, Minutes, Seconds) na desetinné stupně
 * @param degrees Stupně
 * @param minutes Minuty
 * @param seconds Sekundy
 * @param direction Směr (N/S/E/W)
 * @returns Desetinné stupně
 */
export function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: 'N' | 'S' | 'E' | 'W'
): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}
