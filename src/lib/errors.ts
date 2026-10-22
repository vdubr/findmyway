// Převod chyb (Supabase/PostgREST, síť, vlastní) na hlášku pro uživatele.
// Surové hlášky PostgREST jsou anglické a technické – uživateli se ukáže jen to, co dává smysl.

const CODE_MESSAGES: Record<string, string> = {
  '42501': 'K této akci nemáte oprávnění.',
  '23505': 'Takový záznam už existuje.',
  '23514': 'Některá hodnota je mimo povolený rozsah.',
  PGRST116: 'Záznam nebyl nalezen, nebo k němu nemáte přístup.',
  PGRST301: 'Přihlášení vypršelo. Přihlaste se prosím znovu.',
};

// Vlastní chyby aplikace a RPC mají české texty – ty se zobrazí beze změny
const CZECH_TEXT = /[ěščřžýáíéúůďťňó]/i;

export function toUserMessage(err: unknown, fallback: string): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Nejste připojeni k internetu.';
  }

  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  const message = (err as { message?: unknown } | null)?.message;
  if (typeof message === 'string') {
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return 'Server není dostupný. Zkontrolujte připojení a zkuste to znovu.';
    }
    if (CZECH_TEXT.test(message)) return message;
  }

  return fallback;
}
