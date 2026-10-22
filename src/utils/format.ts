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
