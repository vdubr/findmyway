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
 * Délka trasy přes body v daném pořadí
 * @param points Body seřazené podle pořadí na trase
 * @returns Součet vzdáleností mezi sousedními body v metrech, pod 2 body undefined
 */
export function routeLength(points: GeoLocation[]): number | undefined {
  if (points.length < 2) return undefined;
  let total = 0;
  for (let i = 1; i < points.length; i++) total += calculateDistance(points[i - 1], points[i]);
  return total;
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
  // Česká desetinná čárka (2,5 km)
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Azimut (směr) z jednoho bodu do druhého
 * @param from Výchozí bod
 * @param to Cílový bod
 * @returns Azimut ve stupních (0-360, kde 0 je sever, 90 východ)
 */
export function calculateBearing(from: GeoLocation, to: GeoLocation): number {
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Směr k cíli vzhledem k tomu, kam míří telefon
 * @param bearing Azimut k cíli (0-360 od severu)
 * @param heading Azimut, kam míří telefon (0-360 od severu)
 * @returns Úhel 0-360 ve směru hodinových ručiček (0 = cíl je přímo vpředu)
 */
export function relativeBearing(bearing: number, heading: number): number {
  return (((bearing - heading) % 360) + 360) % 360;
}

/**
 * Úhel pro šipku ke checkpointu
 * @param bearing Azimut k cíli, null = neznámá poloha
 * @param heading Kam míří telefon, null = bez kompasu
 * @returns S kompasem směr vzhledem k telefonu, bez kompasu azimut vůči severu,
 *          bez polohy null (šipka se neotáčí)
 */
export function arrowAngle(bearing: number | null, heading: number | null): number | null {
  if (bearing === null) return null;
  return heading === null ? bearing : relativeBearing(bearing, heading);
}

/**
 * Další úhel pro CSS rotaci, změněný po nejkratší cestě – při přechodu 359° → 0° se šipka
 * pootočí o 1°, ne o celou otáčku dozadu (CSS transition interpoluje číselně)
 * @param previous Předchozí zobrazený úhel (může být mimo 0-360), null = první hodnota
 * @param angle Nový úhel 0-360
 */
export function continuousAngle(previous: number | null, angle: number): number {
  if (previous === null) return angle;
  const delta = ((((angle - previous) % 360) + 540) % 360) - 180;
  return previous + delta;
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
  let degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  let minutes = Math.floor(minutesFloat);
  let seconds = Math.round((minutesFloat - minutes) * 60);

  // Zaokrouhlení může dát 60 s (např. 50.0833333 → 50°4'60") – přenést do minut/stupňů
  if (seconds === 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes === 60) {
    minutes = 0;
    degrees += 1;
  }

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

/**
 * Výpočet těžiště (centroidu) z pole souřadnic
 * @param points Pole bodů s latitude a longitude
 * @returns Těžiště jako GeoLocation, nebo null pokud je pole prázdné
 */
export function calculateCentroid(
  points: Array<{ latitude: number; longitude: number }>
): GeoLocation | null {
  const n = points.length;
  if (n === 0) return null;

  const sumLat = points.reduce((sum, p) => sum + p.latitude, 0);
  const sumLng = points.reduce((sum, p) => sum + p.longitude, 0);

  return {
    latitude: sumLat / n,
    longitude: sumLng / n,
  };
}
