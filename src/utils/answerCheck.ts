// Ověřování odpovědí hráče proti SHA-256 hashům z databáze.
//
// Řešení úkolů (odpověď na hádanku, souřadnice dalšího bodu) klient nikdy nedostane
// v plaintextu – jen hash normalizované hodnoty (sloupce checkpoints.answer_hash,
// solution_lat_hash, solution_lng_hash, plněné triggerem z checkpoint_secrets).
// Ověření běží lokálně, takže funguje i offline.
//
// Normalizace zde MUSÍ odpovídat SQL funkcím puzzle_answer_hash a dms_hash
// v supabase/migrations/007_checkpoint_secrets.sql – jinak správná odpověď neprojde.
import type { CoordinateDMS } from '../types';

// SHA-256 textu v UTF-8 jako hex (shodné s pgcrypto digest(..., 'sha256'))
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Odpověď na hádanku: bez okrajových mezer (jako btrim), malými písmeny (jako lower)
export function normalizePuzzleAnswer(answer: string): string {
  return answer.replace(/^ +| +$/g, '').toLowerCase();
}

// Prázdná odpověď = hádanka bez řešení (SQL vrací NULL)
export async function hashPuzzleAnswer(answer: string | null | undefined): Promise<string | null> {
  if (!answer) return null;
  const normalized = normalizePuzzleAnswer(answer);
  return normalized ? sha256Hex(normalized) : null;
}

// DMS souřadnice jako celkový počet sekund se znaménkem (S/W záporné), sekundy zaokrouhlené
export function dmsToSignedSeconds(dms: CoordinateDMS): number {
  const sign = dms.direction === 'S' || dms.direction === 'W' ? -1 : 1;
  const total =
    Math.round(dms.degrees) * 3600 + Math.round(dms.minutes) * 60 + Math.round(dms.seconds);
  // -0 by se jako text lišilo od SQL ("0")
  return sign * total || 0;
}

export async function hashDms(dms: CoordinateDMS): Promise<string> {
  return sha256Hex(String(dmsToSignedSeconds(dms)));
}

export async function verifyPuzzleAnswer(answer: string, answerHash: string): Promise<boolean> {
  const hash = await hashPuzzleAnswer(answer);
  return hash !== null && hash === answerHash;
}

// Tolerance ±toleranceSeconds se řeší porovnáním hashů sousedních hodnot –
// hash je jednosměrný, rozdíl spočítat nejde
export async function verifyDmsCoordinate(
  input: CoordinateDMS,
  expectedHash: string,
  toleranceSeconds = 1
): Promise<boolean> {
  const center = dmsToSignedSeconds(input);
  const tolerance = Math.max(0, Math.round(toleranceSeconds));
  for (let delta = -tolerance; delta <= tolerance; delta++) {
    const hash = await sha256Hex(String(center + delta || 0));
    if (hash === expectedHash) return true;
  }
  return false;
}

export interface CoordinateCheckResult {
  isValid: boolean;
  latitudeCorrect: boolean;
  longitudeCorrect: boolean;
  message: string;
}

export async function verifyCoordinates(
  inputLatitude: CoordinateDMS,
  inputLongitude: CoordinateDMS,
  latitudeHash: string,
  longitudeHash: string,
  toleranceSeconds = 1
): Promise<CoordinateCheckResult> {
  const [latitudeCorrect, longitudeCorrect] = await Promise.all([
    verifyDmsCoordinate(inputLatitude, latitudeHash, toleranceSeconds),
    verifyDmsCoordinate(inputLongitude, longitudeHash, toleranceSeconds),
  ]);
  const isValid = latitudeCorrect && longitudeCorrect;

  let message: string;
  if (isValid) {
    message = 'Správně! Souřadnice jsou správné.';
  } else if (!latitudeCorrect && !longitudeCorrect) {
    message = 'Obě souřadnice jsou nesprávné. Zkuste to znovu.';
  } else if (!latitudeCorrect) {
    message = 'Zeměpisná šířka je nesprávná. Délka je správně.';
  } else {
    message = 'Zeměpisná délka je nesprávná. Šířka je správně.';
  }

  return { isValid, latitudeCorrect, longitudeCorrect, message };
}
