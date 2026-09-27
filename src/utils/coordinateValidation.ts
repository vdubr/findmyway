// Validace souřadnic zadaných uživatelem proti správné odpovědi
import type { CoordinateDMS, SecretSolution } from '../types';
import { decimalToDMS, dmsToDecimal } from './geo';

/**
 * Porovná dvě DMS souřadnice s tolerancí
 * @param input Souřadnice zadaná uživatelem
 * @param secret Správná souřadnice
 * @param toleranceSeconds Tolerance v sekundách (výchozí 1)
 * @returns true pokud se souřadnice shodují v rámci tolerance
 */
export function compareDMSCoordinates(
  input: CoordinateDMS,
  secret: CoordinateDMS,
  toleranceSeconds: number = 1
): boolean {
  // Porovnání v celkových sekundách se znaménkem – tolerance tak platí i přes hranici
  // minuty či stupně (50°4'59" vs 50°5'0" je rozdíl 1 s, ne jiná minuta)
  const diff = Math.abs(toSignedSeconds(input) - toSignedSeconds(secret));
  // Malá rezerva kvůli desetinným sekundám v uloženém řešení
  return diff <= toleranceSeconds + 1e-9;
}

function toSignedSeconds(coord: CoordinateDMS): number {
  const sign = coord.direction === 'S' || coord.direction === 'W' ? -1 : 1;
  return sign * (coord.degrees * 3600 + coord.minutes * 60 + coord.seconds);
}

/**
 * Validuje celou odpověď (latitude + longitude) proti správnému řešení
 * @param inputLatitude Zeměpisná šířka zadaná uživatelem
 * @param inputLongitude Zeměpisná délka zadaná uživatelem
 * @param solution Správné řešení
 * @param toleranceSeconds Tolerance v sekundách (výchozí 1)
 * @returns objekt s výsledkem validace a detaily
 */
export function validateCoordinateInput(
  inputLatitude: CoordinateDMS,
  inputLongitude: CoordinateDMS,
  solution: SecretSolution,
  toleranceSeconds: number = 1
): {
  isValid: boolean;
  latitudeCorrect: boolean;
  longitudeCorrect: boolean;
  message: string;
} {
  const latitudeCorrect = compareDMSCoordinates(inputLatitude, solution.latitude, toleranceSeconds);
  const longitudeCorrect = compareDMSCoordinates(
    inputLongitude,
    solution.longitude,
    toleranceSeconds
  );

  const isValid = latitudeCorrect && longitudeCorrect;

  let message = '';
  if (isValid) {
    message = '🎉 Správně! Souřadnice jsou správné.';
  } else if (!latitudeCorrect && !longitudeCorrect) {
    message = '❌ Obě souřadnice jsou nesprávné. Zkuste to znovu.';
  } else if (!latitudeCorrect) {
    message = '⚠️ Zeměpisná šířka je nesprávná. Délka je správně.';
  } else {
    message = '⚠️ Zeměpisná délka je nesprávná. Šířka je správně.';
  }

  return {
    isValid,
    latitudeCorrect,
    longitudeCorrect,
    message,
  };
}

/**
 * Pomocná funkce pro vytvoření falešného checkpointu
 * Posune souřadnice o náhodnou hodnotu aby se zdály validní ale byly špatně
 */
export function createFakeCheckpoint(
  realLocation: SecretSolution,
  offsetDegrees: number = 0.001 // cca 100m
): SecretSolution {
  const latDecimal = dmsToDecimal(
    realLocation.latitude.degrees,
    realLocation.latitude.minutes,
    realLocation.latitude.seconds,
    realLocation.latitude.direction
  );

  const lonDecimal = dmsToDecimal(
    realLocation.longitude.degrees,
    realLocation.longitude.minutes,
    realLocation.longitude.seconds,
    realLocation.longitude.direction
  );

  // Přidáme offset
  const newLatDecimal = latDecimal + offsetDegrees;
  const newLonDecimal = lonDecimal + offsetDegrees;

  // Převedeme zpět na DMS
  const newLatDMS = decimalToDMS(newLatDecimal, true);
  const newLonDMS = decimalToDMS(newLonDecimal, false);

  return {
    latitude: newLatDMS as CoordinateDMS,
    longitude: newLonDMS as CoordinateDMS,
  };
}
