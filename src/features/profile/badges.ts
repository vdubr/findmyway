// Odznaky v profilu – počítají se jen ze statistik profilu, bez dalších dat v DB
import type { ProfileStats } from '../../lib/api';

export type BadgeId = 'first-finish' | 'three-finishes' | 'creator' | 'explorer';

export interface Badge {
  id: BadgeId;
  label: string;
  goal: string; // co pro odznak udělat
  unlocked: boolean;
  progress: string; // např. „1/3“
}

interface BadgeRule {
  id: BadgeId;
  label: string;
  goal: string;
  target: number;
  value: (stats: ProfileStats) => number;
}

const RULES: BadgeRule[] = [
  {
    id: 'first-finish',
    label: 'První poklad',
    goal: 'Dohraj první hru',
    target: 1,
    value: (s) => s.gamesCompleted,
  },
  {
    id: 'three-finishes',
    label: 'Zkušená liška',
    goal: 'Dohraj 3 hry',
    target: 3,
    value: (s) => s.gamesCompleted,
  },
  {
    id: 'creator',
    label: 'Tvůrce stezek',
    goal: 'Vytvoř první hru',
    target: 1,
    value: (s) => s.gamesCreated,
  },
  {
    id: 'explorer',
    label: 'Průzkumník',
    goal: 'Zahraj si 10 her',
    target: 10,
    value: (s) => s.gamesPlayed,
  },
];

export function computeBadges(stats: ProfileStats): Badge[] {
  return RULES.map((rule) => {
    const value = Math.max(0, rule.value(stats));
    return {
      id: rule.id,
      label: rule.label,
      goal: rule.goal,
      unlocked: value >= rule.target,
      progress: `${Math.min(value, rule.target)}/${rule.target}`,
    };
  });
}
