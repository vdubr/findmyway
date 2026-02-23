# GeoQuest - Pravidla pro OpenCode agenta

## Obecná pravidla

### Jazyk

- **Všechny komentáře v kódu**: česky
- **UI texty a zprávy**: česky
- **Commit zprávy**: česky
- **Dokumentace**: česky
- **Komunikace s uživatelem**: česky

### Emoji pravidlo

- **NIKDY nepoužívat emoji** v kódu, commitech ani UI textech
- Emoji používat **pouze pokud uživatel explicitně požádá**

## Workflow pravidla

### Kdy provádět změny

- **Změny provádět JEN když uživatel explicitně požádá**: "nasad", "proved", "commitni", "oprav to"
- **Nikdy neměnit kód proaktivně** bez jasné žádosti
- **Vždy se zeptat** pokud není jasné, co uživatel chce

### Git commits

- **Formát commit zprávy**: `Type: Stručný popis v češtině`
  - Příklady typů: `Feature`, `Fix`, `UI`, `Style`, `Refactor`, `Docs`
- **Před každým commitem**: spustit `npm run build` pro ověření
- **Commit message pravidla**:
  - "add" = zcela nová funkce
  - "update" = vylepšení existující funkce
  - "fix" = oprava chyby
- **NIKDY necommitovat** bez explicitního požadavku uživatele
- **NIKDY nepoužívat** `--no-verify`, `--amend` nebo `--force` bez explicitního požadavku

### Build a deploy proces

1. Spustit `npm run build` pro ověření
2. Spustit `npm run format` pro formátování (Biome)
3. Git add + commit s českou zprávou
4. Git push na remote
5. Vercel automaticky deployuje

## Tech Stack

### Frontend

- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: Material-UI (MUI) v5
- **Téma**: Přírodní zelené (`#2D6A4F` primary)
- **Mapy**: OpenLayers (ne Leaflet, ne MapBox)
- **State management**: Zustand
- **Routing**: React Router v6

### Backend / Database

- **Supabase**: PostgreSQL + Auth + Storage
- **Auth**: Supabase Auth (Google OAuth ready)
- **Storage**: Supabase Storage pro obrázky

### Build & Linting

- **Linter/Formatter**: **Biome** (NE ESLint, NE Prettier)
- **Build**: Vite
- **Deploy**: Vercel + GitHub

### PWA

- **Service Worker**: Workbox (vite-plugin-pwa)
- **Offline storage**: IndexedDB (localforage)
- **Strategy**: Offline-first pro games a checkpoints

## Architektura

### Folder struktura

```
src/
├── assets/          # Obrázky (liška průvodce)
├── components/      # Sdílené komponenty
├── features/        # Feature moduly
│   ├── auth/       # Autentizace
│   ├── game/       # Správa her (creator)
│   ├── map/        # Mapové komponenty
│   └── player/     # Herní interface pro hráče
├── hooks/          # Custom hooks (useGeolocation, useDeviceOrientation)
├── lib/            # Utilities (api, supabase, offlineStorage)
├── store/          # Zustand stores
├── types/          # TypeScript typy
└── utils/          # Helper funkce
```

### Důležité soubory

- `src/lib/api.ts` - API funkce s offline-first strategií
- `src/lib/supabase.ts` - Supabase client konfigurace
- `src/lib/offlineStorage.ts` - IndexedDB wrapper
- `src/lib/anonymousSessions.ts` - Anonymní session tracking
- `vite.config.ts` - PWA konfigurace

## Klíčové funkce

### 1. PWA Offline podpora

- Games a checkpoints se cachují v IndexedDB
- Service Worker s runtime caching
- Offline-first strategie v API funkcích
- PWA install prompt komponenta

### 2. Anonymní přístup

- Veřejné hry se dají hrát bez registrace
- Session tracking přes localStorage (ne Supabase)
- Route `/play/:gameId` je veřejná

### 3. GPS tracking

- Hook: `useGeolocation`
- `enableHighAccuracy: true` pro přesnou GPS
- Timeout 30s, maximumAge 5s
- Kružnice přesnosti na mapě

### 4. Kompas/Azimut

- Hook: `useDeviceOrientation`
- iOS: webkitCompassHeading
- Android: alpha (360 - hodnota)
- Zelená šipka na mapě ukazuje směr telefonu

### 5. Mapa

- OpenLayers (ne Leaflet!)
- Vrstvu accuracy circle (GPS přesnost)
- Vrstvu user position (s šipkou směru)
- Vrstvu markers (checkpoints, targets)
- **Re-centrování pouze při změně checkpointu** (ne při GPS update)

### 6. Liška průvodce

- 7 stavů: idle, thinking, excited, walking, solving, celebrating, treasure
- Canvas API pro odstranění zelené barvy (#c8df46)
- Automatická změna podle stránky
- Inline režim pro dialogy

## API funkce (src/lib/api.ts)

### Offline-first funkce

- `getGameById(gameId)` - cachuje do IndexedDB
- `getCheckpointsByGameId(gameId)` - cachuje do IndexedDB
- Při offline: vrací data z cache
- Při online: fetchuje a aktualizuje cache

### Session funkce

- `getActiveSession(gameId)` - podporuje anonymní sessions
- `startGameSession(gameId)` - vytvoří session (Supabase nebo localStorage)
- `updateSessionProgress(...)` - update session
- `completeGameSession(...)` - dokončení hry

## UI Komponenty

### AppLayout

- Obsahuje header s liškou
- PWA install prompt
- Offline indikátor
- Navigation

### PlayerPage (herní interface)

- **Layout**: Flexbox s overflow: hidden
  - Alerts nahoře (flexShrink: 0)
  - Mapa uprostřed (flex: 1, absolute positioning)
  - Distance indicator dole (flexShrink: 0)
- GPS permission request při startu
- Kompas permission (optional)
- Real-time distance tracking
- Checkpoint completion dialogs

### DistanceIndicator

- Kompaktní horizontální layout (~60-70px výška)
- Progress bar s `1/3` popiskem
- Vzdálenost + NavigationIcon
- "V dosahu" Chip když je blízko

### MapComponent

- Props: center, zoom, userLocation, userAccuracy, userHeading, markers, height
- **Re-centruje pouze při významné změně** (>100m = nový checkpoint)
- Accuracy circle (průhledná zelená kružnice)
- User marker se šipkou směru (pokud je heading)

## Supabase schéma

### Tabulky

- `profiles` - uživatelské profily
- `games` - definice her (creator_id, title, settings, status)
- `checkpoints` - checkpointy (game_id, lat/lon, content, secret_solution)
- `game_sessions` - herní sessions (user_id, game_id, progress)
- `checkpoint_completions` - dokončené checkpointy

### RLS (Row Level Security)

- Veřejné hry: čtení pro všechny
- Privátní hry: jen pro creatora
- Sessions: jen vlastník nebo anonymní

## Environment variables (.env)

```
VITE_SUPABASE_URL=https://xhviegkjqxnrtkxirvnt.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

## Google OAuth Setup

- Google Cloud Console: OAuth 2.0 Client vytvořen
- Redirect URI: `https://xhviegkjqxnrtkxirvnt.supabase.co/auth/v1/callback`
- Supabase: Google provider nakonfigurován
- **Status**: Čeká na opravu OAuth Consent Screen v Google Console

## Repository a Deploy

- **GitHub**: https://github.com/vdubr/findmyway
- **Production**: https://findmyway-psi.vercel.app
- **Auto-deploy**: Git push → Vercel build → Deploy

## Coding Standards

### TypeScript

- Striktní typing
- Žádné `any` bez důvodu
- Explicit return types na exported funkcích
- Interface > Type (pro objekty)

### React

- Functional components (ne class components)
- Hooks (useState, useEffect, custom hooks)
- `biome-ignore` komentáře pro legitimate useEffect dependency warnings

### Styling

- MUI `sx` prop (NE styled-components)
- Responsive design (Mobile-first)
- Theme colors z MUI theme palette

### Uvozovky (Quotes)

**DŮLEŽITÉ**: Vždy dodržovat Biome formátování, neměnit uvozovky ručně!

- **JavaScript/TypeScript kód**: Jednoduché uvozovky `'`
  - Příklad: `const name = 'GeoQuest';`
  - Příklad: `import { Box } from '@mui/material';`
- **JSX atributy**: Dvojité uvozovky `"`
  - Příklad: `<Button variant="contained">Začít</Button>`
  - Příklad: `<Box sx={{ color: "primary.main" }}>`
- **NIKDY neměnit uvozovky ručně** - při generování kódu rovnou používat správný styl
- Před commitem vždy spustit `npm run format` pro kontrolu

### File naming

- Components: PascalCase (UserProfile.tsx)
- Hooks: camelCase s "use" prefixem (useGeolocation.ts)
- Utils: camelCase (offlineStorage.ts)
- Types: PascalCase nebo camelCase podle typu

## Testing

- Build před každým commitem: `npm run build`
- Format před commitem: `npm run format`
- Manuální testing v browseru (dev server)

## Known Issues / TODO

### Optimalizace potřebné

1. **Obrázky lišky** - komprimovat z ~9MB na ~2MB celkem
2. **Code splitting** - webpack chunk >500KB warning
3. **Google OAuth** - dokončit OAuth Consent Screen setup

### Feature backlog

- [ ] Leaderboard / scoring systém
- [ ] Share game funkce (QR kód)
- [ ] Offline vytváření her
- [ ] Dark mode
- [ ] Další jazyky (EN)

## Dokumentace

### Živé dokumenty (vždy udržovat aktuální)

- **README.md** - Hlavní dokumentace projektu pro uživatele
  - Aktualizovat při přidání nových features
  - Aktualizovat při změně tech stacku
  - Aktualizovat při změně deployment procesu
- **SETUP.md** - Návod na lokální setup projektu
  - Aktualizovat při přidání nových dependencies
  - Aktualizovat při změně environment variables
  - Aktualizovat při změně build procesu

### Pravidla pro dokumentaci

- README.md a SETUP.md **vždy udržovat aktuální**
- Při změně kódu, která ovlivňuje dokumentaci, **aktualizovat dokumentaci ihned**
- Dokumentaci psát **česky**
- Používat **jasné, stručné formulace**

## Důležité poznámky

### Co NIKDY nedělat

- ❌ Nepoužívat ESLint/Prettier (máme Biome)
- ❌ Nepoužívat Leaflet pro mapy (máme OpenLayers)
- ❌ Neměnit Supabase credentials v kódu
- ❌ Necommitovat .env soubory
- ❌ Nepoužívat emoji bez explicitního požadavku
- ❌ Necommitovat bez build + format check
- ❌ Nevytvářet markdown dokumentaci proaktivně
- ❌ Nenechávat README.md nebo SETUP.md zastaralé

### Debugging tipy

- Dev server běží na port 5174 (5173 byl obsazený)
- Console.log pro GPS debug je OK během vývoje
- Biome warnings jsou často legitimní - nepoužívat `biome-ignore` bez důvodu

## Changelog highlights

### Poslední změny (Feb 2026)

- ✅ Přidána kružnice GPS přesnosti na mapě
- ✅ Opraveno překreslování mapy při GPS update
- ✅ Přidán kompas/azimut feature (šipka směru telefonu)
- ✅ Optimalizován layout - mapa na celý prostor, kompaktní distance indicator
- ✅ Opraveno zobrazení mapy s absolute positioning

### Historie (starší)

- ✅ PWA offline podpora s IndexedDB caching
- ✅ Anonymní přístup k veřejným hrám
- ✅ Safari iOS autofill fix
- ✅ Biome migrace z ESLint+Prettier
- ✅ Liška průvodce s canvas transparentním pozadím
- ✅ Přesná GPS poloha (enableHighAccuracy: true)

---

**Poslední update**: 23. února 2026  
**OpenCode verze**: claude-sonnet-4.5  
**Projekt status**: Aktivní vývoj
