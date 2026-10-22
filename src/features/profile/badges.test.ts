import { describe, expect, it } from 'vitest';
import { computeBadges } from './badges';

describe('computeBadges', () => {
  it('nový hráč nemá nic odemčeno', () => {
    const badges = computeBadges({ gamesCreated: 0, gamesPlayed: 0, gamesCompleted: 0 });
    expect(badges.every((b) => !b.unlocked)).toBe(true);
    expect(badges.find((b) => b.id === 'three-finishes')?.progress).toBe('0/3');
  });

  it('odemyká podle statistik a progres nepřeteče cíl', () => {
    const badges = computeBadges({ gamesCreated: 2, gamesPlayed: 4, gamesCompleted: 3 });
    const byId = Object.fromEntries(badges.map((b) => [b.id, b]));
    expect(byId['first-finish'].unlocked).toBe(true);
    expect(byId['first-finish'].progress).toBe('1/1');
    expect(byId['three-finishes'].unlocked).toBe(true);
    expect(byId.creator.unlocked).toBe(true);
    expect(byId.explorer.unlocked).toBe(false);
    expect(byId.explorer.progress).toBe('4/10');
  });
});
