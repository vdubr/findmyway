import { describe, expect, it } from 'vitest';
import {
  arrowAngle,
  calculateBearing,
  calculateDistance,
  continuousAngle,
  decimalToDMS,
  dmsToDecimal,
  isWithinRadius,
  relativeBearing,
} from './geo';

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

  describe('calculateBearing', () => {
    const origin = { latitude: 50, longitude: 14 };

    it('vrací azimut ke světovým stranám', () => {
      expect(calculateBearing(origin, { latitude: 50.01, longitude: 14 })).toBeCloseTo(0, 1);
      expect(calculateBearing(origin, { latitude: 50, longitude: 14.01 })).toBeCloseTo(90, 0);
      expect(calculateBearing(origin, { latitude: 49.99, longitude: 14 })).toBeCloseTo(180, 1);
      expect(calculateBearing(origin, { latitude: 50, longitude: 13.99 })).toBeCloseTo(270, 0);
    });

    it('vrací hodnotu v rozsahu 0-360', () => {
      const bearing = calculateBearing(origin, { latitude: 50.01, longitude: 13.999 });
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
      expect(bearing).toBeGreaterThan(270);
    });
  });

  describe('relativeBearing', () => {
    it('0 = cíl přímo vpředu', () => {
      expect(relativeBearing(90, 90)).toBe(0);
    });

    it('cíl vpravo a vlevo', () => {
      expect(relativeBearing(90, 0)).toBe(90);
      expect(relativeBearing(0, 90)).toBe(270);
    });

    it('správně přechází přes sever', () => {
      expect(relativeBearing(10, 350)).toBe(20);
      expect(relativeBearing(350, 10)).toBe(340);
    });
  });

  describe('arrowAngle', () => {
    it('s kompasem směr vzhledem k natočení telefonu', () => {
      expect(arrowAngle(90, 30)).toBe(60);
    });

    it('bez kompasu azimut vůči severu', () => {
      expect(arrowAngle(135, null)).toBe(135);
    });

    it('bez polohy null', () => {
      expect(arrowAngle(null, 10)).toBeNull();
    });
  });

  describe('continuousAngle', () => {
    it('první hodnotu vrací beze změny', () => {
      expect(continuousAngle(null, 350)).toBe(350);
    });

    it('přes sever pokračuje nejkratší cestou', () => {
      expect(continuousAngle(350, 10)).toBe(370);
      expect(continuousAngle(10, 350)).toBe(-10);
    });

    it('navazuje i na úhel mimo 0-360', () => {
      expect(continuousAngle(370, 30)).toBe(390);
      expect(continuousAngle(-10, 180)).toBe(-180);
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

    it('přenese zaokrouhlených 60 sekund do minut', () => {
      // 50.0833333 = 50°4'59.99" → nesmí vyjít 50°4'60"
      const result = decimalToDMS(50.0833333, true);

      expect(result).toEqual({ degrees: 50, minutes: 5, seconds: 0, direction: 'N' });
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
