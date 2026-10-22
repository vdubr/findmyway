import { describe, expect, it } from 'vitest';
import type { CoordinateDMS } from '../types';
import {
  dmsToSignedSeconds,
  hashDms,
  hashPuzzleAnswer,
  normalizePuzzleAnswer,
  sha256Hex,
  verifyCoordinates,
  verifyDmsCoordinate,
  verifyPuzzleAnswer,
} from './answerCheck';

// Pevné vektory – shodné s SQL funkcemi v migraci 007 (sha256_hex, puzzle_answer_hash, dms_hash).
// Změna normalizace tady bez změny v SQL by rozbila ověřování odpovědí.
const SHA_TEST = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
const SHA_PRAHA = 'f377db9f1f0af132866afd5c4381512a5c9a3b3a32e9ca2f88f0aced18264568';
const SHA_180299 = 'b0a608ef6340ab658326c6a1ecf2899e2da29af67399769eca6ba3eb2abdefc6';
const SHA_MINUS_180299 = '39911a947b4dbcf1a8c06a8324732a723af10bd5126662e32c31bbcc1f76541b';

const LAT_50_4_59: CoordinateDMS = { degrees: 50, minutes: 4, seconds: 59, direction: 'N' };

describe('sha256Hex', () => {
  it('odpovídá pgcrypto digest(..., sha256) v hex', async () => {
    expect(await sha256Hex('test')).toBe(SHA_TEST);
  });
});

describe('normalizePuzzleAnswer', () => {
  it('ořízne okrajové mezery a převede na malá písmena (jako lower(btrim()))', () => {
    expect(normalizePuzzleAnswer('  PRAHA ')).toBe('praha');
    expect(normalizePuzzleAnswer('Ěščř')).toBe('ěščř');
  });
});

describe('hashPuzzleAnswer', () => {
  it('hashuje normalizovanou odpověď', async () => {
    expect(await hashPuzzleAnswer(' Praha ')).toBe(SHA_PRAHA);
  });

  it('prázdná odpověď = bez řešení (null, jako SQL)', async () => {
    expect(await hashPuzzleAnswer('')).toBeNull();
    expect(await hashPuzzleAnswer('   ')).toBeNull();
    expect(await hashPuzzleAnswer(null)).toBeNull();
  });
});

describe('dmsToSignedSeconds', () => {
  it('sčítá stupně, minuty a sekundy', () => {
    expect(dmsToSignedSeconds(LAT_50_4_59)).toBe(180299);
  });

  it('S a W jsou záporné', () => {
    expect(dmsToSignedSeconds({ ...LAT_50_4_59, direction: 'S' })).toBe(-180299);
    expect(dmsToSignedSeconds({ degrees: 14, minutes: 0, seconds: 0, direction: 'W' })).toBe(
      -50400
    );
  });

  it('zaokrouhluje desetinné sekundy a nevrací -0', () => {
    expect(dmsToSignedSeconds({ degrees: 50, minutes: 4, seconds: 58.6, direction: 'N' })).toBe(
      180299
    );
    expect(
      Object.is(dmsToSignedSeconds({ degrees: 0, minutes: 0, seconds: 0, direction: 'S' }), 0)
    ).toBe(true);
  });
});

describe('hashDms', () => {
  it('hashuje celkové sekundy jako text', async () => {
    expect(await hashDms(LAT_50_4_59)).toBe(SHA_180299);
    expect(await hashDms({ ...LAT_50_4_59, direction: 'S' })).toBe(SHA_MINUS_180299);
  });
});

describe('verifyPuzzleAnswer', () => {
  it('přijme odpověď bez ohledu na velikost písmen a okrajové mezery', async () => {
    expect(await verifyPuzzleAnswer('PRAHA', SHA_PRAHA)).toBe(true);
    expect(await verifyPuzzleAnswer(' praha  ', SHA_PRAHA)).toBe(true);
  });

  it('odmítne jinou odpověď i prázdnou odpověď', async () => {
    expect(await verifyPuzzleAnswer('brno', SHA_PRAHA)).toBe(false);
    expect(await verifyPuzzleAnswer('', SHA_PRAHA)).toBe(false);
  });
});

describe('verifyDmsCoordinate', () => {
  it('přijme přesnou hodnotu', async () => {
    expect(await verifyDmsCoordinate(LAT_50_4_59, SHA_180299)).toBe(true);
  });

  it('toleruje ±1 s i přes hranici minuty', async () => {
    const next: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 0, direction: 'N' };
    expect(await verifyDmsCoordinate(next, SHA_180299)).toBe(true);
  });

  it('odmítne rozdíl 2 s a jiný směr', async () => {
    const twoOff: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 1, direction: 'N' };
    expect(await verifyDmsCoordinate(twoOff, SHA_180299)).toBe(false);
    expect(await verifyDmsCoordinate({ ...LAT_50_4_59, direction: 'S' }, SHA_180299)).toBe(false);
  });

  it('s nulovou tolerancí přijme jen přesnou hodnotu', async () => {
    const next: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 0, direction: 'N' };
    expect(await verifyDmsCoordinate(next, SHA_180299, 0)).toBe(false);
  });
});

describe('verifyCoordinates', () => {
  const lng: CoordinateDMS = { degrees: 14, minutes: 25, seconds: 17, direction: 'E' };

  it('vyhodnotí obě souřadnice a vrátí zprávu', async () => {
    const lngHash = await hashDms(lng);
    const ok = await verifyCoordinates(LAT_50_4_59, lng, SHA_180299, lngHash);
    expect(ok.isValid).toBe(true);
    expect(ok.message).toContain('Správně');

    const wrongLng = await verifyCoordinates(
      LAT_50_4_59,
      { ...lng, seconds: 30 },
      SHA_180299,
      lngHash
    );
    expect(wrongLng).toMatchObject({
      isValid: false,
      latitudeCorrect: true,
      longitudeCorrect: false,
    });
    expect(wrongLng.message).toContain('délka');
  });
});
