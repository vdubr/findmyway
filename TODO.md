# TODO

## Perzistence rozehrané hry (uspání telefonu, zavření záložky)

**Problém:** Hráč rozehraje hru, telefon usne nebo iOS uvolní záložku z paměti. Po návratu
se stránka načte znovu: ukáže se úvodní dialog „Začít hru“, znovu se žádá o GPS a kompas,
sdílení polohy se rozjede od začátku. Postup (index checkpointu) se dnes už ukládá do
session (DB pro přihlášené, localStorage pro anonymní), ale obnovení je vázané na
stejné zařízení a stejný prohlížeč; při smazání dat nebo na jiném zařízení je hra pryč.

**Návrh:** rozehranou hru identifikovat v URL, např. `/games/:gameId/game/:sessionId/:checkpointIndex`.

- `sessionId` = UUID session (přihlášený: `game_sessions.id`; anonymní: nově generované
  UUID místo dnešního `anonymous_{gameId}`, aby šla session obnovit i na jiném zařízení
  přes odkaz – vyžaduje ukládat anonymní session i do DB, tj. RLS/INSERT pro roli `anon`
  omezený na vlastní `session_id`, nebo `signInAnonymously()`).
- `checkpointIndex` = aktuální bod, při každém postupu se URL přepíše (`navigate(..., { replace: true })`).
  Při načtení stránky má přednost stav ze session; index z URL slouží jen jako záloha,
  když session není dostupná (offline, cizí zařízení).
- Po načtení URL s existující session přeskočit úvodní dialog a rovnou obnovit hru
  (GPS oprávnění si prohlížeč pamatuje, stačí znovu zavolat `requestPermission`).
- Záložka/PWA zavřená uprostřed hry: odkaz na rozehranou hru nabídnout i v seznamu her
  („Pokračovat ve hře“) podle aktivní session.

**Pozor:** index v URL si hráč může přepsat a skočit dopředu. Bránit tomu nemá smysl
(řešení úkolů jsou stejně jen hashe), ale server nesmí index z URL brát jako důkaz
splnění – skóre a `checkpoints_completed` se musí dál odvíjet jen ze session.

**Soubory:** `src/App.tsx` (routa), `src/features/player/pages/PlayerPage.tsx`,
`src/features/player/store/gamePlayStore.ts`, `src/lib/anonymousSessions.ts`,
`src/lib/api.ts` (`startGameSession`), případně migrace pro anonymní session v DB.
