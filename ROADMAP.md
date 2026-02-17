# GeoQuest - Realizační Roadmap

## ✅ KROK 1: Initial Setup & Architecture (DOKONČENO)

### Vytvořeno:

- ✅ Vite + React 18 + TypeScript projekt
- ✅ Feature-based složková struktura
- ✅ Material UI s custom hravým tématem
- ✅ React Router s základními routami
- ✅ Supabase client konfigurace (placeholder)
- ✅ ESLint + Prettier setup
- ✅ Vitest + React Testing Library
- ✅ TypeScript typy pro entity
- ✅ Geo utility funkce (Haversine, DMS konverze)
- ✅ Základní konstanty

### Struktura:

```
src/
├── features/
│   ├── auth/pages/AuthPage.tsx
│   ├── admin/pages/AdminPage.tsx
│   ├── game/pages/HomePage.tsx
│   └── player/pages/PlayerPage.tsx
├── lib/supabase.ts
├── types/index.ts
├── utils/
│   ├── geo.ts
│   └── constants.ts
├── theme.ts
└── App.tsx
```

---

## ✅ KROK 2: Database Definition (DOKONČENO)

### Vytvořeno:

- ✅ Kompletní SQL schéma pro všechny tabulky
  - ✅ Tabulka `profiles` (extends auth.users)
  - ✅ Tabulka `games` (včetně JSONB settings)
  - ✅ Tabulka `checkpoints` (lat/lng + JSONB content/solution)
  - ✅ Tabulka `game_sessions` (tracking herního postupu)
  - ✅ Tabulka `checkpoint_completions` (tracking jednotlivých kroků)
- ✅ RLS (Row Level Security) policies pro všechny tabulky
  - ✅ Veřejné hry čitelné všemi
  - ✅ Tvůrce může CRUD jen své hry
  - ✅ Session management s bezpečným přístupem
- ✅ Storage buckety a policies
  - ✅ `checkpoint-images` bucket (public read, creator write)
  - ✅ `avatars` bucket (public read, own write)
- ✅ TypeScript typy synchronizované s DB schématem
- ✅ Helper API funkce pro všechny CRUD operace
- ✅ Seed data pro testování (volitelné)
- ✅ Kompletní dokumentace setup procesu

### Soubory:

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   ├── 003_storage_setup.sql
│   └── 004_seed_data.sql
└── README.md

src/
├── lib/
│   ├── supabase.ts (aktualizováno s Database types)
│   ├── database.types.ts (generované typy)
│   └── api.ts (helper funkce pro DB operace)
└── types/
    └── index.ts (aktualizováno podle schématu)
```

---

## ✅ KROK 3: Core Components & Layout (DOKONČENO)

### Vytvořeno:

#### 1. Autentizace

- ✅ `src/features/auth/AuthContext.tsx` - Auth provider s hooks
  - `useAuth()` hook pro přístup k auth stavu
  - `signInWithGoogle()` - Google OAuth přihlášení
  - `signOut()` - odhlášení
  - Automatické načítání profilu uživatele
- ✅ `src/features/auth/pages/AuthPage.tsx` - Přihlašovací stránka
  - Google OAuth button
  - Error handling
  - Auto-redirect po přihlášení

#### 2. Layout & Navigation

- ✅ `src/components/AppLayout.tsx` - Hlavní layout aplikace
  - Responsive header s logo a user menu
  - Bottom navigation pro mobile (Home, Create, Play)
  - Desktop navigation v headeru
  - User avatar a profile menu
- ✅ `src/components/ProtectedRoute.tsx` - Route guard pro chráněné stránky
  - Auto-redirect na /auth pokud není přihlášen
- ✅ `src/App.tsx` - Aktualizováno s AuthProvider a Layout

#### 3. Map Component

- ✅ `src/features/map/components/MapComponent.tsx` - OpenLayers wrapper
  - Základní mapa s OSM tiles
  - Marker systém (checkpoint, user, target)
  - Click handler pro interakce
  - Custom styles podle MUI theme

#### 4. Utility Components

- ✅ `src/components/LoadingSpinner.tsx` - Loading state component
- ✅ `src/components/ErrorDisplay.tsx` - Error message component
- ✅ `src/components/ErrorBoundary.tsx` - React error boundary

#### 5. HomePage Update

- ✅ `src/features/game/pages/HomePage.tsx` - Aktualizováno
  - Hero sekce s CTA buttony
  - Seznam veřejných her (Grid layout)
  - Integrace s Auth contextem
  - Error handling a loading states
  - Responsive design

### Soubory:

```
src/
├── features/
│   ├── auth/
│   │   ├── AuthContext.tsx (NEW)
│   │   └── pages/AuthPage.tsx (UPDATED)
│   ├── map/
│   │   └── components/MapComponent.tsx (NEW)
│   └── game/
│       └── pages/HomePage.tsx (UPDATED)
├── components/
│   ├── AppLayout.tsx (NEW)
│   ├── ProtectedRoute.tsx (NEW)
│   ├── LoadingSpinner.tsx (NEW)
│   ├── ErrorDisplay.tsx (NEW)
│   └── ErrorBoundary.tsx (NEW)
└── App.tsx (UPDATED)
```

### Status:

- ✅ Build: Passing
- ✅ Tests: 8/8 Passing
- ✅ Lint: Clean
- ⚠️ Supabase: Needs real credentials in `.env`
- ⚠️ Google OAuth: Needs configuration in Supabase dashboard

---

## ✅ KROK 4: Admin Feature (Game Creation) (DOKONČENO)

### Vytvořeno:

#### 1. State Management (Zustand store)

- ✅ `src/features/admin/store/gameEditorStore.ts` - Store pro vytváření her
  - Správa aktuální hry a dočasných checkpointů
  - Operace pro přidání/editaci/smazání checkpointů
  - Reordering checkpointů
  - UI state management (modaly, drawery)

#### 2. Game Creator Form

- ✅ `src/features/admin/components/GameCreatorForm.tsx` - Formulář pro novou hru
  - Základní info (název, popis, obtížnost)
  - Nastavení (radius tolerance, allow_skip, max_players, time_limit)
  - Public/Private toggle
  - Validace formuláře

#### 3. Map Editor

- ✅ `src/features/admin/components/MapEditor.tsx` - Editor pro umístění checkpointů
  - Kliknutí na mapu = přidání checkpointu
  - Zobrazení všech checkpointů jako markerů
  - Seznam checkpointů s možností editace a smazání
  - Integrace s MapComponent

#### 4. Checkpoint Editor

- ✅ `src/features/admin/components/CheckpointEditor.tsx` - Editor detailů checkpointu
  - Typ checkpointu (info/puzzle/input)
  - Název a popis
  - Nápověda
  - Radius detekce
  - Secret solution (DMS formát) pro typ 'input'
  - Drawer UI s validací

#### 5. Game List

- ✅ `src/features/admin/components/GameList.tsx` - Správa vlastních her
  - Zobrazení všech her uživatele
  - Publish/Unpublish toggle
  - Editace a smazání her
  - Confirm dialog pro smazání

#### 6. Admin Page

- ✅ `src/features/admin/pages/AdminPage.tsx` - Hlavní admin rozhraní
  - Multi-step workflow (Form → Map → Checkpoint editing)
  - Integrace všech komponent
  - Ukládání hry a checkpointů do Supabase
  - Error handling a success messages

### Soubory:

```
src/features/admin/
├── store/
│   └── gameEditorStore.ts (NEW)
├── components/
│   ├── GameCreatorForm.tsx (NEW)
│   ├── MapEditor.tsx (NEW)
│   ├── CheckpointEditor.tsx (NEW)
│   └── GameList.tsx (NEW)
└── pages/
    └── AdminPage.tsx (UPDATED)
```

### Status:

- ✅ Build: Passing
- ✅ Tests: 8/8 Passing
- ✅ Lint: Clean
- ⚠️ TODO: Drag & drop pro reordering checkpointů (nice to have)
- ⚠️ TODO: Nahrávání obrázků pro checkpointy (nice to have)
- ⚠️ TODO: Editace existujících her (bude implementováno později)

---

## ✅ KROK 5: Game Logic & GPS Hook (DOKONČENO)

### Vytvořeno:

#### 1. GPS Tracking Hook

- ✅ `src/hooks/useGeolocation.ts` - Custom hook pro GPS tracking
  - Sledování pozice uživatele pomocí watchPosition API
  - Error handling pro různé GPS chyby
  - Permission management
  - High accuracy mode

#### 2. Game Play State Management

- ✅ `src/features/player/store/gamePlayStore.ts` - Zustand store pro herní stav
  - Správa aktuální hry, checkpointů a session
  - Real-time výpočet vzdálenosti k checkpointu
  - Automatická detekce vstupu do radiusu checkpointu
  - Progress tracking a completion logic
  - Victory state management

#### 3. Player Components

- ✅ `src/features/player/components/DistanceIndicator.tsx` - Zobrazení vzdálenosti
  - Progress bar s aktuálním checkpoint indexem
  - Real-time vzdálenost k checkpointu
  - Barevné indikátory (červená/oranžová/zelená)
  - Status zprávy
- ✅ `src/features/player/components/CheckpointContentDialog.tsx` - Dialog pro checkpoint
  - Zobrazení názvu, popisu, obrázku
  - Nápověda
  - Type-specific obsah (info/puzzle/input)
  - Skip a Complete akce

#### 4. Player Game Screen

- ✅ `src/features/player/pages/PlayerPage.tsx` - Hlavní herní rozhraní
  - Game intro dialog s informacemi o hře
  - GPS permission request flow
  - Live mapa s uživatelovou pozicí a checkpointy
  - Distance indicator s real-time updates
  - Checkpoint content dialog při dosažení
  - Victory screen po dokončení hry
  - Session persistence (pokračování ve hře)

### Soubory:

```
src/
├── hooks/
│   └── useGeolocation.ts (NEW)
├── features/player/
│   ├── store/
│   │   └── gamePlayStore.ts (NEW)
│   ├── components/
│   │   ├── DistanceIndicator.tsx (NEW)
│   │   └── CheckpointContentDialog.tsx (NEW)
│   └── pages/
│       └── PlayerPage.tsx (UPDATED)
```

### Status:

- ✅ Build: Passing
- ✅ Tests: 8/8 Passing
- ✅ Lint: Clean
- ✅ Dev Server: Funkční (http://localhost:5173)
- ⚠️ TODO: Puzzle/Input validation (KROK 6)
- ⚠️ TODO: Azimut směr indikátor (nice to have)

---

## ✅ KROK 6: The "Drum Roll" Input (DOKONČENO)

### Vytvořeno:

#### 1. DrumRollPicker Component

- ✅ `src/components/DrumRollPicker.tsx` - iOS-style picker
  - Plynulé scrollování s snap-to-value
  - Touch a mouse podpora
  - Configurable min/max values
  - Opacity/scale efekty pro lepší UX
  - Label a suffix customization

#### 2. CoordinatePicker Component

- ✅ `src/features/player/components/CoordinatePicker.tsx` - DMS input
  - Samostatné pickery pro degrees, minutes, seconds
  - Toggle buttons pro směr (N/S, E/W)
  - Live preview zadaných souřadnic
  - Validace rozsahů (0-90° lat, 0-180° lng)

#### 3. Coordinate Validation

- ✅ `src/utils/coordinateValidation.ts` - Validační logika
  - `compareDMSCoordinates()` - porovnání s tolerancí
  - `validateCoordinateInput()` - kompletní validace lat+lng
  - `createFakeCheckpoint()` - generování fake checkpointů
  - Detailní error messages (česky)
- ✅ `src/utils/coordinateValidation.test.ts` - Kompletní testy
  - 12 testů pokrývajících všechny scénáře
  - Edge cases a tolerance testing

#### 4. Enhanced CheckpointContentDialog

- ✅ Aktualizováno s podporou všech typů checkpointů:
  - **Info** - Jednoduchý "Pokračovat" button
  - **Puzzle** - TextField pro odpověď + validace
  - **Input** - CoordinatePicker + validace souřadnic
- ✅ Real-time validation feedback
- ✅ Animated success/error alerts
- ✅ Auto-pokračování po správné odpovědi

#### 5. Puzzle Support

- ✅ Rozšířeno `CheckpointContent` o `puzzle_answer` field
- ✅ Admin editor s inputem pro správnou odpověď
- ✅ Case-insensitive validace v player dialogu

#### 6. Fake Checkpoints

- ✅ Rozšířeno `Checkpoint` o `is_fake` flag
- ✅ Toggle v admin editoru
- ✅ Helper funkce pro generování fake souřadnic

#### 7. Image Upload

- ✅ `src/features/admin/components/CheckpointEditor.tsx` - Upload UI
  - File input s validací typu a velikosti
  - Image preview před nahráním
  - Delete functionality
  - Error handling s user feedback
- ✅ Integrace s existujícím API (`uploadCheckpointImage()`)

### Soubory:

```
src/
├── components/
│   └── DrumRollPicker.tsx (NEW)
├── features/
│   ├── player/components/
│   │   ├── CoordinatePicker.tsx (NEW)
│   │   └── CheckpointContentDialog.tsx (UPDATED)
│   └── admin/components/
│       └── CheckpointEditor.tsx (UPDATED - image upload + puzzle answer)
├── utils/
│   ├── coordinateValidation.ts (NEW)
│   └── coordinateValidation.test.ts (NEW)
└── types/
    └── index.ts (UPDATED - is_fake, puzzle_answer fields)
```

### Status:

- ✅ Build: Passing (1.1 MB, 334 KB gzipped)
- ✅ Tests: 20/20 Passing (8 geo + 12 validation)
- ✅ Lint: Clean
- ✅ TypeScript: No errors
- ✅ All KROK 6 requirements completed

---

## 🚀 DALŠÍ KROKY (Nice to have)

- [ ] PWA manifest a service worker
- [ ] Offline mode support
- [ ] Achievement system
- [ ] Leaderboards
- [ ] Social sharing
- [ ] Dark mode toggle
- [ ] Multi-language support (i18n)
- [ ] Tutorial/onboarding flow
- [ ] Analytics (Supabase Analytics nebo Plausible)

---

## 📱 React Native Migration Prep

- ✅ Separace hooks od UI komponent
- [ ] Testování logiky nezávisle na UI
- [ ] Dokumentace API kontraktů
- [ ] Shared utils a types v samostatném balíčku
