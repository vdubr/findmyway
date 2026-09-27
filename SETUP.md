# GeoQuest - Quick Start Guide

## 🚀 Spuštění projektu

### 1. Instalace závislostí
```bash
npm install
```

### 2. Konfigurace Supabase

#### Vytvoření .env souboru
```bash
cp .env.example .env
```

#### Nastavení Supabase credentials
1. Přihlaste se na [Supabase Dashboard](https://app.supabase.com)
2. Vytvořte nový projekt
3. V Settings > API zkopírujte:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon/Public key → `VITE_SUPABASE_ANON_KEY`

#### Spuštění SQL migracií
V Supabase SQL Editoru postupně spusťte:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_storage_setup.sql`
4. `supabase/migrations/004_seed_data.sql` (volitelné - testovací data)
5. `supabase/migrations/005_player_locations.sql`
6. `supabase/migrations/006_security_fixes.sql`

#### Nastavení Google OAuth (volitelné pro testování)
1. V Supabase Dashboard > Authentication > Providers
2. Povolte Google provider
3. Zkopírujte Client ID a Secret z [Google Cloud Console](https://console.cloud.google.com)

### 3. Development

#### Spuštění dev serveru
```bash
npm run dev
```
Server běží na `http://localhost:5173`

#### Build pro produkci
```bash
npm run build
```

#### Preview produkčního buildu
```bash
npm run preview
```

### 4. Testing

#### Spuštění testů
```bash
npm test
```

#### Testy s UI
```bash
npm run test:ui
```

#### Linting
```bash
npm run lint
```

#### Formátování
```bash
npm run format
```

## 📱 Testování aplikace

### Bez Supabase (pouze frontend)
- HomePage zobrazí placeholder pro hry
- Admin panel bude vyžadovat autentizaci
- GPS tracking funguje (prohlížeč vyžádá oprávnění)

### S Supabase (plná funkcionalita)
1. **Přihlášení**: Klikněte na "Přihlásit se" → Google OAuth
2. **Vytvoření hry**:
   - Admin Panel → Nová hra
   - Vyplňte formulář
   - Klikejte na mapu pro přidání checkpointů
   - Editujte každý checkpoint
   - Uložte hru
3. **Hraní hry**:
   - Hlavní stránka → Vyberte hru → Hrát
   - Povolte GPS
   - Sledujte vzdálenost k checkpointu
   - Checkpoint se automaticky zobrazí při vstupu do radiusu

## 🔍 Testování GPS bez fyzického pohybu

### Chrome DevTools
1. Otevřete DevTools (F12)
2. Přejděte na tab "Sensors"
3. V sekci "Location" vyberte nebo zadejte vlastní souřadnice
4. Aplikace bude používat tyto souřadnice místo skutečné GPS pozice

### Firefox
1. Otevřete `about:config`
2. Nastavte:
   - `geo.enabled` = true
   - `geo.provider.use_corelocation` = false
   - `geo.wifi.uri` = vlastní mock server

## 🛠️ Řešení problémů

### Build fails s TypeScript chybami
```bash
# Smazat cache a node_modules
rm -rf node_modules dist
npm install
npm run build
```

### GPS nefunguje
- Zkontrolujte HTTPS (nebo localhost)
- Povolte location permissions v prohlížeči
- Na mobilu zkontrolujte system settings

### Supabase connection errors
- Ověřte `.env` soubor
- Zkontrolujte RLS policies
- Zkontrolujte network tab v DevTools

## 📁 Důležité soubory

- `src/lib/supabase.ts` - Supabase client konfigurace
- `src/lib/api.ts` - API helper funkce
- `src/types/index.ts` - TypeScript typy
- `src/utils/geo.ts` - GPS utility funkce
- `supabase/migrations/` - SQL migrace

## 🎯 Hlavní komponenty

- `src/features/admin/pages/AdminPage.tsx` - Admin panel
- `src/features/player/pages/PlayerPage.tsx` - Herní rozhraní
- `src/features/game/pages/HomePage.tsx` - Úvodní stránka
- `src/hooks/useGeolocation.ts` - GPS hook

## 📚 Další zdroje

- [React Documentation](https://react.dev)
- [Material UI Docs](https://mui.com)
- [Supabase Docs](https://supabase.com/docs)
- [OpenLayers Examples](https://openlayers.org/examples/)
- [Zustand Guide](https://zustand.docs.pmnd.rs/)
