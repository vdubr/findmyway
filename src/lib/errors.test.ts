import { describe, expect, it } from 'vitest';
import { toUserMessage } from './errors';

describe('toUserMessage', () => {
  it('známý kód převede na českou hlášku', () => {
    expect(toUserMessage({ code: '42501' }, 'x')).toBe('K této akci nemáte oprávnění.');
  });

  it('chybějící sloupec nebo funkce = zastaralá aplikace', () => {
    for (const code of ['42703', '42883', 'PGRST202', 'PGRST204']) {
      expect(toUserMessage({ code, message: 'column x does not exist' }, 'x')).toMatch(
        /Obnovte prosím stránku/
      );
    }
  });

  it('český text z RPC ponechá', () => {
    expect(toUserMessage({ message: 'Hru nemůžete upravovat' }, 'x')).toBe('Hru nemůžete upravovat');
  });

  it('neznámou anglickou chybu nahradí fallbackem', () => {
    expect(toUserMessage({ message: 'something broke' }, 'Chyba při ukládání hry')).toBe(
      'Chyba při ukládání hry'
    );
  });
});
