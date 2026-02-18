import { describe, expect, it } from 'vitest';
import { calculateDistance, decimalToDMS, dmsToDecimal, isWithinRadius } from './geo';

describe('Geo Utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Praha - Staroměstské náměstí
      const point1 = { latitude: 50.0875, longitude: 14.4213 };
      // Praha - Václavské náměstí (cca 1km)
      const point2 = { latitude: 50.0813, longitude: 14.4283 };

      const distance = calculateDistance(point1, point2);

      // Očekáváme vzdálenost kolem 800-900m
      expect(distance).toBeGreaterThan(700);
      expect(distance).toBeLessThan(1000);
    });

    it('should return 0 for the same point', () => {
      const point = { latitude: 50.0875, longitude: 14.4213 };
      const distance = calculateDistance(point, point);

      expect(distance).toBe(0);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true when within radius', () => {
      const user = { latitude: 50.0875, longitude: 14.4213 };
      const checkpoint = { latitude: 50.0876, longitude: 14.4214 };
      const radius = 20; // 20 metrů

      expect(isWithinRadius(user, checkpoint, radius)).toBe(true);
    });

    it('should return false when outside radius', () => {
      const user = { latitude: 50.0875, longitude: 14.4213 };
      const checkpoint = { latitude: 50.1, longitude: 14.5 };
      const radius = 10; // 10 metrů

      expect(isWithinRadius(user, checkpoint, radius)).toBe(false);
    });
  });

  describe('DMS conversions', () => {
    it('should convert decimal to DMS correctly', () => {
      const result = decimalToDMS(50.0875, true);

      expect(result.degrees).toBe(50);
      expect(result.minutes).toBe(5);
      expect(result.seconds).toBeGreaterThanOrEqual(14);
      expect(result.seconds).toBeLessThanOrEqual(16);
      expect(result.direction).toBe('N');
    });

    it('should convert negative decimal to DMS with correct direction', () => {
      const result = decimalToDMS(-14.4213, false);

      expect(result.degrees).toBe(14);
      expect(result.direction).toBe('W');
    });

    it('should convert DMS back to decimal', () => {
      const decimal = dmsToDecimal(50, 5, 15, 'N');

      expect(decimal).toBeCloseTo(50.0875, 2);
    });

    it('should handle South and West directions', () => {
      const south = dmsToDecimal(50, 5, 15, 'S');
      const west = dmsToDecimal(14, 25, 17, 'W');

      expect(south).toBeLessThan(0);
      expect(west).toBeLessThan(0);
    });
  });
});
