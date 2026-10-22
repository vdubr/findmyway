/**
 * Český tvar slova podle počtu (1 bod, 2–4 body, 0 a 5+ bodů)
 * @param count Počet
 * @param one Tvar pro 1
 * @param few Tvar pro 2–4
 * @param many Tvar pro 0 a 5 a více
 */
export function pluralCs(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count);
  if (abs === 1) return one;
  if (abs >= 2 && abs <= 4) return few;
  return many;
}

/**
 * Délka hry pro člověka (48 min, 1 h 12 min)
 * @param ms Doba v milisekundách
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
