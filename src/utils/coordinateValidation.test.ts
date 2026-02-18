// Testy pro validaci souřadnic
import { describe, expect, it } from 'vitest';
import type { CoordinateDMS, SecretSolution } from '../types';
import {
  compareDMSCoordinates,
  createFakeCheckpoint,
  validateCoordinateInput,
} from './coordinateValidation';

describe('compareDMSCoordinates', () => {
  it('should return true for identical coordinates', () => {
    const coord1: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'N' };
    const coord2: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'N' };

    expect(compareDMSCoordinates(coord1, coord2)).toBe(true);
  });

  it('should return false for different directions', () => {
    const coord1: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'N' };
    const coord2: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'S' };

    expect(compareDMSCoordinates(coord1, coord2)).toBe(false);
  });

  it('should return false for different degrees', () => {
    const coord1: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'N' };
    const coord2: CoordinateDMS = { degrees: 51, minutes: 5, seconds: 10, direction: 'N' };

    expect(compareDMSCoordinates(coord1, coord2)).toBe(false);
  });

  it('should return false for different minutes', () => {
    const coord1: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'N' };
    const coord2: CoordinateDMS = { degrees: 50, minutes: 6, seconds: 10, direction: 'N' };

    expect(compareDMSCoordinates(coord1, coord2)).toBe(false);
  });

  it('should return true for seconds within tolerance', () => {
    const coord1: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'N' };
    const coord2: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 11, direction: 'N' };

    expect(compareDMSCoordinates(coord1, coord2, 1)).toBe(true);
  });

  it('should return false for seconds outside tolerance', () => {
    const coord1: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 10, direction: 'N' };
    const coord2: CoordinateDMS = { degrees: 50, minutes: 5, seconds: 12, direction: 'N' };

    expect(compareDMSCoordinates(coord1, coord2, 1)).toBe(false);
  });
});

describe('validateCoordinateInput', () => {
  const solution: SecretSolution = {
    latitude: { degrees: 50, minutes: 5, seconds: 10, direction: 'N' },
    longitude: { degrees: 14, minutes: 25, seconds: 30, direction: 'E' },
  };

  it('should validate correct coordinates', () => {
    const result = validateCoordinateInput(solution.latitude, solution.longitude, solution);

    expect(result.isValid).toBe(true);
    expect(result.latitudeCorrect).toBe(true);
    expect(result.longitudeCorrect).toBe(true);
    expect(result.message).toContain('Správně');
  });

  it('should detect incorrect latitude', () => {
    const wrongLat: CoordinateDMS = { degrees: 51, minutes: 5, seconds: 10, direction: 'N' };

    const result = validateCoordinateInput(wrongLat, solution.longitude, solution);

    expect(result.isValid).toBe(false);
    expect(result.latitudeCorrect).toBe(false);
    expect(result.longitudeCorrect).toBe(true);
    expect(result.message).toContain('šířka je nesprávná');
  });

  it('should detect incorrect longitude', () => {
    const wrongLon: CoordinateDMS = { degrees: 15, minutes: 25, seconds: 30, direction: 'E' };

    const result = validateCoordinateInput(solution.latitude, wrongLon, solution);

    expect(result.isValid).toBe(false);
    expect(result.latitudeCorrect).toBe(true);
    expect(result.longitudeCorrect).toBe(false);
    expect(result.message).toContain('délka je nesprávná');
  });

  it('should detect both coordinates incorrect', () => {
    const wrongLat: CoordinateDMS = { degrees: 51, minutes: 5, seconds: 10, direction: 'N' };
    const wrongLon: CoordinateDMS = { degrees: 15, minutes: 25, seconds: 30, direction: 'E' };

    const result = validateCoordinateInput(wrongLat, wrongLon, solution);

    expect(result.isValid).toBe(false);
    expect(result.latitudeCorrect).toBe(false);
    expect(result.longitudeCorrect).toBe(false);
    expect(result.message).toContain('Obě souřadnice jsou nesprávné');
  });
});

describe('createFakeCheckpoint', () => {
  const realSolution: SecretSolution = {
    latitude: { degrees: 50, minutes: 5, seconds: 10, direction: 'N' },
    longitude: { degrees: 14, minutes: 25, seconds: 30, direction: 'E' },
  };

  it('should create a fake checkpoint with different coordinates', () => {
    const fake = createFakeCheckpoint(realSolution);

    // Ověříme, že souřadnice nejsou identické
    const sameLatitude =
      fake.latitude.degrees === realSolution.latitude.degrees &&
      fake.latitude.minutes === realSolution.latitude.minutes &&
      fake.latitude.seconds === realSolution.latitude.seconds;

    const sameLongitude =
      fake.longitude.degrees === realSolution.longitude.degrees &&
      fake.longitude.minutes === realSolution.longitude.minutes &&
      fake.longitude.seconds === realSolution.longitude.seconds;

    expect(sameLatitude && sameLongitude).toBe(false);
  });

  it('should create a fake checkpoint with valid DMS format', () => {
    const fake = createFakeCheckpoint(realSolution);

    // Validace latitude
    expect(fake.latitude.degrees).toBeGreaterThanOrEqual(0);
    expect(fake.latitude.degrees).toBeLessThanOrEqual(90);
    expect(fake.latitude.minutes).toBeGreaterThanOrEqual(0);
    expect(fake.latitude.minutes).toBeLessThanOrEqual(59);
    expect(fake.latitude.seconds).toBeGreaterThanOrEqual(0);
    expect(fake.latitude.seconds).toBeLessThanOrEqual(59);
    expect(['N', 'S']).toContain(fake.latitude.direction);

    // Validace longitude
    expect(fake.longitude.degrees).toBeGreaterThanOrEqual(0);
    expect(fake.longitude.degrees).toBeLessThanOrEqual(180);
    expect(fake.longitude.minutes).toBeGreaterThanOrEqual(0);
    expect(fake.longitude.minutes).toBeLessThanOrEqual(59);
    expect(fake.longitude.seconds).toBeGreaterThanOrEqual(0);
    expect(fake.longitude.seconds).toBeLessThanOrEqual(59);
    expect(['E', 'W']).toContain(fake.longitude.direction);
  });
});
