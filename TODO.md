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

## Falešné checkpointy (`is_fake`) bez účinku ve hře

**Problém:** Editor má přepínač „Falešný checkpoint“ a příznak se ukládá do DB, ale hráčská
logika ho nikde nečte – falešný bod je obyčejný bod v pořadí a počítá se do postupu i skóre.

**Nejdřív rozhodnout význam**, např.:
- návnada na mapě, kterou hra nevyžaduje (zobrazit, ale nezahrnout do `checkpoints[index]`
  ani do skóre), nebo
- špatná odpověď u úkolu „zadej souřadnice dalšího bodu“ (hráč na ni může dojít a hra mu
  řekne, že je to slepá stopa).

**Soubory:** `src/features/player/store/gamePlayStore.ts` (postup, skóre),
`src/features/player/pages/PlayerPage.tsx` (markery), `src/features/admin/components/DemoPlayer.tsx`,
`src/features/admin/components/CheckpointEditor.tsx` (nápověda u přepínače).

## Časový limit hry se nevynucuje

**Problém:** `settings.time_limit` (minuty) se nastavuje v editoru a ukazuje v úvodním dialogu
hry, ale nic ho nehlídá – hra pokračuje i po jeho uplynutí.

**Návrh:** odpočet od `session.start_time` (přežije reload i uspání telefonu), zobrazit zbývající
čas v `DistanceIndicator`, po vypršení ukončit hru dialogem a uložit session jako `abandoned`
nebo `completed` s dosavadním skóre. Rozhodnout, zda se do limitu počítá i čas, kdy byla
aplikace zavřená (pravděpodobně ano – limit je od startu).

**Soubory:** `src/features/player/store/gamePlayStore.ts`, `src/features/player/pages/PlayerPage.tsx`,
`src/features/player/components/DistanceIndicator.tsx`, `src/lib/api.ts` (stav session).

## DemoPlayer duplikuje herní logiku

**Problém:** `src/features/admin/components/DemoPlayer.tsx` (~460 řádků) má vlastní kopii
logiky z `PlayerPage` a `gamePlayStore` (postup, radius, dialogy, follow režim mapy). Kopie se
už rozcházejí a každá oprava hry se musí dělat dvakrát.

**Návrh:** vytáhnout herní logiku do sdíleného hooku (např. `useGamePlay`) nebo store s
pluggable perzistencí – PlayerPage ukládá do session, demo nic neukládá a polohu simuluje
tlačítkem „Objevit checkpoint“. UI (mapa, `DistanceIndicator`, `CheckpointContentDialog`,
dialog výhry) sdílet jako komponenty.

**Soubory:** `src/features/admin/components/DemoPlayer.tsx`, `src/features/player/pages/PlayerPage.tsx`,
`src/features/player/store/gamePlayStore.ts`.

## Sledování hrajících hráčů správcem hry

**Cíl:** správce (tvůrce hry) vidí, kdo jeho hru právě hraje – na mapě polohu hráčů, u každého
jméno, aktuální checkpoint (např. 3/7), čas posledního signálu a dosavadní postup.

**Co už existuje:** tabulka `player_locations` + view `active_players_view` (hráči aktivní
posledních 5 minut, po migraci 006 jen pro tvůrce hry), realtime odběr
`subscribeToPlayerLocations` a dialog `LivePlayersMap` v editoru (tlačítko „Živí hráči“).

**Co chybí:**
- Sledování je jen u her se zapnutým „Vyžadovat sdílení polohy“ a tlačítko je schované
  v editoru – přidat přehled hráčů i do detailu hry pro tvůrce.
- Anonymní hráči se nesledují (session není v DB) – souvisí s perzistencí hry výše
  (anonymní session v DB nebo `signInAnonymously()`).
- Bez polohy (sdílení vypnuté) ukazovat aspoň seznam rozehraných session a postup
  z `game_sessions` (aktuální checkpoint, start, poslední aktivita).
- Historie: kdo hru dokončil, za jak dlouho, se skóre.
- Realtime refetchuje celé view při změně polohy kteréhokoli hráče v jakékoli hře
  (`player_locations` nemá `game_id`) – přidat `game_id` do `player_locations`
  a filtrovat realtime podle hry.
- Soukromí: hráč musí před startem jasně vědět, že ho správce vidí (dnes upozornění
  v úvodním dialogu jen u povinného sdílení).

**Soubory:** `src/features/admin/components/LivePlayersMap.tsx`,
`src/features/admin/pages/AdminEditPage.tsx`, `src/features/game/pages/GameDetailPage.tsx`,
`src/lib/api.ts` (`subscribeToPlayerLocations`), nová migrace (`game_id` v `player_locations`,
politika SELECT `game_sessions` pro tvůrce už existuje).
