# Supabase Database Setup Guide

Tento dokument obsahuje kompletní návod pro nastavení Supabase databáze pro GeoQuest projekt.

## 📋 Prerekvizity

1. Supabase účet na [supabase.com](https://supabase.com)
2. Vytvořený nový projekt v Supabase Dashboard

## 🚀 Postup instalace

### Krok 1: Získání credentials

1. Přejdi na [Supabase Dashboard](https://app.supabase.com)
2. Vyber svůj projekt
3. Jdi na **Settings** → **API**
4. Zkopíruj:
   - **Project URL** (např. `https://abcdefgh.supabase.co`)
   - **anon/public key** (veřejný klíč pro client)

### Krok 2: Konfigurace .env

1. Zkopíruj `.env.example` do `.env`:

   ```bash
   cp .env.example .env
   ```

2. Doplň credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Krok 3: Spuštění migrations

V Supabase Dashboard:

1. Jdi na **SQL Editor**
2. Postupně spusť všechny migrace v pořadí:

#### Migration 001: Initial Schema

- Soubor: `supabase/migrations/001_initial_schema.sql`
- Vytváří základní tabulky: profiles, games, checkpoints, game_sessions, checkpoint_completions
- Nastavuje triggery pro auto-update `updated_at`
- Vytváří funkci pro auto-vytvoření profilu při registraci

#### Migration 002: RLS Policies

- Soubor: `supabase/migrations/002_rls_policies.sql`
- Aktivuje Row Level Security na všech tabulkách
- Definuje přístupová práva pro čtení/zápis
- Vytváří helper funkce: `is_game_creator()`, `can_access_game()`

#### Migration 003: Storage Setup

- **POZNÁMKA**: Storage buckety a policies se vytvářejí ručně přes Supabase UI (nelze přes SQL Editor)
- **Status**: ⚠️ **TODO - NEDOKONČENO**

**Postup:**

1. V Supabase Dashboard → **Storage** → **New bucket**
2. Vytvoř buckety:
   - `checkpoint-images` (public: true, limit: 5MB)
   - `avatars` (public: true, limit: 2MB)
3. **TODO**: Nastav Storage Policies pro oba buckety
   - Detaily v souboru `supabase/migrations/003_storage_setup.sql`
   - Policies je potřeba nastavit přes Storage UI nebo Supabase CLI
   - Prozatím buckety fungují jako veřejné (public), ale chybí přístupová omezení

### Krok 4: Ověření

Zkontroluj v Supabase Dashboard:

1. **Database** → **Tables**: Měly by být vidět všechny tabulky
2. **Authentication** → **Policies**: RLS policies by měly být aktivní
3. **Storage**: Měly by existovat 2 buckety

## 📊 Databázové schéma

### Tabulky

```
profiles
├── id (UUID, PK, FK -> auth.users)
├── email (TEXT)
├── username (TEXT, UNIQUE, NULLABLE)
├── avatar_url (TEXT, NULLABLE)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

games
├── id (UUID, PK)
├── creator_id (UUID, FK -> profiles)
├── title (TEXT)
├── description (TEXT, NULLABLE)
├── is_public (BOOLEAN)
├── difficulty (INTEGER, 1-5)
├── settings (JSONB)
├── status (TEXT: draft|published|archived)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

checkpoints
├── id (UUID, PK)
├── game_id (UUID, FK -> games)
├── order_index (INTEGER)
├── latitude (DOUBLE PRECISION)
├── longitude (DOUBLE PRECISION)
├── radius (DOUBLE PRECISION)
├── type (TEXT: info|puzzle|input)
├── content (JSONB)
├── secret_solution (JSONB, NULLABLE)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

game_sessions
├── id (UUID, PK)
├── user_id (UUID, FK -> profiles)
├── game_id (UUID, FK -> games)
├── current_checkpoint_index (INTEGER)
├── status (TEXT: active|completed|abandoned)
├── start_time (TIMESTAMPTZ)
├── end_time (TIMESTAMPTZ, NULLABLE)
├── score (INTEGER, NULLABLE)
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

checkpoint_completions
├── id (UUID, PK)
├── session_id (UUID, FK -> game_sessions)
├── checkpoint_id (UUID, FK -> checkpoints)
├── entered_at (TIMESTAMPTZ)
├── completed_at (TIMESTAMPTZ, NULLABLE)
├── attempts (INTEGER)
├── entry_latitude (DOUBLE PRECISION, NULLABLE)
├── entry_longitude (DOUBLE PRECISION, NULLABLE)
├── entry_accuracy (DOUBLE PRECISION, NULLABLE)
└── created_at (TIMESTAMPTZ)
```

### JSONB Struktury

#### game.settings

```json
{
  "radius_tolerance": 10,
  "allow_skip": false,
  "max_players": null,
  "time_limit": null
}
```

#### checkpoint.content

```json
{
  "title": "Název checkpointu",
  "description": "Popis úkolu",
  "image_url": "https://...",
  "clue": "Nápověda"
}
```

#### checkpoint.secret_solution

```json
{
  "latitude": {
    "degrees": 50,
    "minutes": 5,
    "seconds": 15,
    "direction": "N"
  },
  "longitude": {
    "degrees": 14,
    "minutes": 25,
    "seconds": 17,
    "direction": "E"
  }
}
```

#### game_session.metadata

```json
{
  "hints_used": 0,
  "wrong_attempts": 0,
  "checkpoints_completed": ["uuid1", "uuid2"]
}
```

## 🔒 Row Level Security (RLS) Politiky

### Profiles

- ✅ Všichni mohou číst všechny profily
- ✅ Uživatel může upravovat jen svůj profil

### Games

- ✅ Všichni vidí veřejné publikované hry
- ✅ Tvůrce vidí všechny své hry
- ✅ Pouze přihlášení mohou vytvářet hry
- ✅ Tvůrce může upravovat/mazat jen své hry

### Checkpoints

- ✅ Viditelné podle viditelnosti hry
- ✅ Pouze tvůrce hry může CRUD checkpointy

### Game Sessions

- ✅ Uživatel vidí jen své sessions
- ✅ Tvůrce hry vidí sessions své hry (statistiky)
- ✅ Uživatel může vytvořit session pro veřejnou hru

### Storage

- ✅ `checkpoint-images`: Veřejně čitelné, pouze tvůrce hry může uploadovat
- ✅ `avatars`: Veřejně čitelné, uživatel může uploadovat jen svůj avatar

## 🔧 Helper Funkce

### `is_game_creator(game_id UUID)`

Vrací `true` pokud aktuální uživatel je tvůrce hry.

### `can_access_game(game_id UUID)`

Vrací `true` pokud uživatel má přístup ke hře (veřejná nebo vlastní).

### `get_checkpoint_image_url(game_id, checkpoint_id, filename)`

Generuje veřejnou URL pro obrázek checkpointu.

### `get_avatar_url(user_id, filename)`

Generuje veřejnou URL pro avatar uživatele.

## 📝 Poznámky

## ⚠️ TODO: Storage Policies (NEDOKONČENO)

**Status**: Storage buckety `checkpoint-images` a `avatars` jsou vytvořené, ale **nemají nastavené přístupové politiky**.

**Co chybí:**

- RLS policies pro omezení upload/delete operací
- Pouze tvůrci her by měli moci nahrávat obrázky ke svým checkpointům
- Pouze vlastníci profilů by měli moci nahrávat své avatary

**Jak to dodělat:**

1. **Přes Supabase UI**: Storage → vyber bucket → Policies → New Policy
   - Detaily politik jsou v `supabase/migrations/003_storage_setup.sql`
2. **Přes Supabase CLI**: Použij příkazy z migrace 003
3. **Přes SQL**: Vyžaduje superuser oprávnění (nelze z běžného SQL Editoru)

**Současný stav:**

- ✅ Buckety jsou veřejné → všichni mohou **číst** obrázky
- ⚠️ Chybí omezení → kdokoliv autentifikovaný může **nahrávat/mazat** (není ideální pro produkci)

**Priorita**: Střední - funkčnost aplikace to neovlivní, ale je to security risk pro produkci.

---

### Google OAuth Setup

1. V Supabase Dashboard jdi na **Authentication** → **Providers**
2. Aktivuj **Google** provider
3. Nastav **Authorized redirect URLs** v Google Cloud Console
4. Zkopíruj Client ID a Client Secret

### PostGIS (volitelné)

Pro pokročilé geolokační funkce můžeš aktivovat PostGIS extension:

```sql
CREATE EXTENSION IF NOT EXISTS "postgis";
```

Pak můžeš použít spatial indexy pro rychlejší vyhledávání.

### Indexy

Všechny důležité indexy jsou již vytvořeny v migrations:

- `idx_games_public` - pro veřejné hry
- `idx_checkpoints_game` - pro checkpointy hry
- `idx_sessions_active` - pro aktivní sessions

## 🐛 Troubleshooting

### "relation does not exist"

- Ujisti se, že jsi spustil všechny migrations v pořadí

### "permission denied"

- Zkontroluj RLS policies
- Ujisti se, že jsi přihlášený (`auth.uid()` není null)

### "unique constraint violation"

- Kontroluj unique constraints v schématu
- Např. jeden uživatel nemůže mít 2 aktivní sessions stejné hry

## 🔄 Aktualizace typu po změně schématu

Pokud změníš databázové schéma:

1. Aktualizuj migration soubor
2. Spusť migraci v Supabase
3. Aktualizuj `src/lib/database.types.ts`
4. Případně aktualizuj `src/types/index.ts`

## 📚 Další kroky

Po úspěšném setup databáze:

- [x] KROK 1: Initial Setup ✅
- [x] KROK 2: Database Definition ✅
- [ ] KROK 3: Core Components & Layout
- [ ] KROK 4: Admin Feature
- [ ] KROK 5: Game Logic & GPS
- [ ] KROK 6: Drum Roll Input
