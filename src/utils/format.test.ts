import { describe, expect, it } from 'vitest';
import { pluralCs } from './format';

describe('pluralCs', () => {
  const bod = (n: number) => pluralCs(n, 'bod', 'body', 'bodů');

  it('1 = jednotné číslo', () => {
    expect(bod(1)).toBe('bod');
  });

  it('2–4 = množné číslo', () => {
    expect(bod(2)).toBe('body');
    expect(bod(4)).toBe('body');
  });

  it('0 a 5+ = genitiv', () => {
    expect(bod(0)).toBe('bodů');
    expect(bod(5)).toBe('bodů');
    expect(bod(12)).toBe('bodů');
  });
});
