# GeoQuest

Webová geolokační herní platforma pro děti i dospělé.

## 🎯 Popis projektu

GeoQuest je responzivní webová aplikace (PWA ready), která umožňuje vytvářet a hrát geolokační hry:

- **Admin** vytváří hru umístěním checkpointů na mapu
- **Hráč** naviguje k checkpointům pomocí GPS
- Po příchodu do stanoveného radiusu se spustí úkol/hádanka
- Hráč zadává souřadnice pomocí "Drum Roll" UI
- Systém podporuje falešné checkpointy pro zvýšení obtížnosti

## 🛠️ Tech Stack

- **Frontend**: React 18+, TypeScript, Vite
- **UI**: Material UI (MUI) s vlastním hravým tématem
- **Mapy**: OpenLayers + OpenStreetMap
- **Backend/DB**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint + Prettier

## 📁 Struktura projektu

```
src/
├── features/          # Feature-based architecture
│   ├── auth/         # Autentizace (Google OAuth)
│   ├── game/         # Hlavní herní logika
│   ├── map/          # Mapové komponenty (OpenLayers)
│   ├── admin/        # Admin rozhraní pro tvorbu her
│   └── player/       # Herní rozhraní pro hráče
├── components/        # Sdílené komponenty
├── hooks/            # Custom React hooks
├── lib/              # Knihovny (Supabase client, utils)
├── types/            # TypeScript definice
├── utils/            # Utility funkce
└── theme.ts          # MUI téma
```

## 🚀 Spuštění projektu

```bash
# Instalace dependencies
npm install

# Spuštění dev serveru
npm run dev

# Build pro produkci
npm run build

# Preview produkční buildu
npm run preview

# Spuštění testů
npm test

# Testy s UI
npm run test:ui

# Linting
npm run lint

# Formátování kódu
npm run format
```

## ⚙️ Konfigurace

1. Zkopírovat `.env.example` do `.env`
2. Doplnit Supabase credentials z [Supabase Dashboard](https://app.supabase.com)

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📋 Realizační plán

- [x] **KROK 1**: Initial Setup & Architecture
- [x] **KROK 2**: Database Definition (SQL schéma + RLS policies)
- [x] **KROK 3**: Core Components & Layout
- [x] **KROK 4**: Admin Feature (tvorba her)
- [x] **KROK 5**: Game Logic & GPS Hook
- [x] **KROK 6**: Drum Roll Input Component & Validations

## 🎨 Design Principles

- **Hravý vzhled**: Výrazné barvy, velké ikony, zaoblené rohy
- **Mobile-first**: Primárně navrženo pro mobilní zařízení
- **Připraveno pro React Native**: Separace logiky (hooks) od UI (components)
- **Přístupnost**: Vysoký kontrast, čitelné fonty

## 📝 License

Private project
