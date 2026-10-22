# FindMyWay – Instrukce pro Claude Code

GPS treasure hunt aplikace pro vytváření a hraní her s checkpointy v reálném světě.

## Jazyk a komunikace

- **Komunikace s uživatelem**: česky
- **Komentáře v kódu**: česky
- **UI texty**: česky
- **Commit zprávy**: česky, formát `Type: Stručný popis` (typy: Feature, Fix, Refactor, Docs, Style, Test)
- **Emoji**: NIKDY nepoužívat, pokud uživatel explicitně nepožádá

## Workflow

- Commitovat **jen když uživatel explicitně požádá**
- Nasadit **jen když uživatel explicitně požádá**
- Před každým commitem spustit `npm run build` a `npm run format`
- Nikdy nepoužívat `--no-verify`, `--amend` nebo `--force` bez explicitního požadavku

## Tech stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **UI**: Material-UI (MUI) v7, `sx` prop (NE styled-components)
- **Mapy**: OpenLayers 10 (NE Leaflet, NE Mapbox)
- **State**: Zustand 5
- **Routing**: React Router v7 (stránky lazy přes `React.lazy` v `App.tsx`)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Linter/Formatter**: Biome (NE ESLint, NE Prettier)
- **Deploy**: Vercel (auto z main branch)

## Coding standards

- Striktní TypeScript, žádné `any` bez důvodu
- Functional components, hooks
- `Interface` preferovat před `Type` pro objekty
- Uvozovky: JS/TS kód = jednoduché `'`, JSX atributy = dvojité `"`
- **Nikdy neměnit uvozovky ručně** – řeší Biome při `npm run format`

## Struktura projektu

```
src/
├── components/      # Sdílené komponenty
├── features/        # Feature moduly (auth, game, map, player)
├── hooks/           # Custom hooks (useGeolocation, useDeviceOrientation)
├── lib/             # api.ts, supabase.ts, offlineStorage.ts, anonymousSessions.ts
├── store/           # Zustand stores
├── types/           # TypeScript typy
└── utils/           # Helper funkce (constants.ts, ...)
```

## Klíčové soubory

- `src/lib/api.ts` – všechny DB operace, offline cache jen při výpadku sítě
- `src/lib/mappers.ts` – jediné místo převodu řádků DB → aplikační typy (žádné `as unknown as` jinde)
- `src/lib/errors.ts` – `toUserMessage()` pro hlášky v catch blocích
- `src/lib/database.types.ts` – Supabase DB typy (generované přes Supabase MCP, ne ručně)
- `src/types/index.ts` – aplikační typy
- `src/lib/anonymousSessions.ts` – localStorage session pro nepřihlášené
- `src/utils/answerCheck.ts` – ověřování odpovědí hráče proti SHA-256 hashům (offline),
  normalizace musí sedět s SQL funkcemi v migraci 007
- `supabase/migrations/` – DB migrace

## Databáze (Supabase)

Tabulky: `profiles`, `games`, `checkpoints`, `checkpoint_secrets`, `game_sessions`, `checkpoint_completions`, `player_locations`
RLS enabled na všech tabulkách. Řešení úkolů je jen v `checkpoint_secrets` (čte tvůrce), hráč dostává
hashe v `checkpoints`. Checkpointy se ukládají jedním RPC `save_game_checkpoints` (transakce).
Nové tabulky musí mít v migraci explicitní GRANT (Supabase je od 30. 10. 2026 nepřidává).
Supabase URL: `https://xhviegkjqxnrtkxirvnt.supabase.co`

## Environment

- `.env` (lokální, gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Dev server: port 5174

## Co NIKDY nedělat

- Nepoužívat ESLint/Prettier (máme Biome)
- Nepoužívat Leaflet nebo Mapbox (máme OpenLayers)
- Necommitovat `.env` soubory
- Nevytvářet markdown dokumentaci proaktivně
- Nenechávat README.md nebo SETUP.md zastaralé po změnách
