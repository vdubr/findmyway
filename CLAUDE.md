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

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Material-UI (MUI) v5, `sx` prop (NE styled-components)
- **Mapy**: OpenLayers (NE Leaflet, NE Mapbox)
- **State**: Zustand
- **Routing**: React Router v6
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

- `src/lib/api.ts` – všechny DB operace, offline-first strategie
- `src/lib/database.types.ts` – Supabase DB typy (generované přes Supabase MCP, ne ručně)
- `src/types/index.ts` – aplikační typy
- `src/lib/anonymousSessions.ts` – localStorage session pro nepřihlášené
- `supabase/migrations/` – DB migrace

## Databáze (Supabase)

Tabulky: `profiles`, `games`, `checkpoints`, `game_sessions`, `checkpoint_completions`
RLS enabled na všech tabulkách.
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
