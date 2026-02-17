-- GeoQuest Database Schema
-- Migration 001: Initial Schema Setup
-- Description: Creates core tables for profiles, games, checkpoints, and game sessions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geolocation support (optional, můžeme použít i lat/lng)
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Rozšíření auth.users tabulky o custom profil
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pro rychlé vyhledávání podle username
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- ============================================================================
-- GAMES TABLE
-- ============================================================================
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
  
  -- Game settings stored as JSONB
  settings JSONB NOT NULL DEFAULT '{
    "radius_tolerance": 10,
    "allow_skip": false,
    "max_players": null,
    "time_limit": null
  }'::jsonb,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy pro efektivní vyhledávání
CREATE INDEX idx_games_creator ON public.games(creator_id);
CREATE INDEX idx_games_public ON public.games(is_public) WHERE is_public = true;
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_games_difficulty ON public.games(difficulty);

-- ============================================================================
-- CHECKPOINTS TABLE
-- ============================================================================
CREATE TABLE public.checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  
  -- Geolocation (používáme klasické lat/lng pro jednoduchost)
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  
  -- Radius pro trigger (v metrech)
  radius DOUBLE PRECISION NOT NULL DEFAULT 10 CHECK (radius > 0),
  
  -- Typ checkpointu
  type TEXT NOT NULL CHECK (type IN ('info', 'puzzle', 'input')),
  
  -- Obsah checkpointu (JSONB pro flexibilitu)
  content JSONB NOT NULL DEFAULT '{
    "title": "",
    "description": "",
    "image_url": null,
    "clue": null
  }'::jsonb,
  
  -- Tajné řešení - souřadnice dalšího bodu (JSONB)
  -- Format: {"degrees": 50, "minutes": 5, "seconds": 15, "direction": "N", "axis": "lat"}
  secret_solution JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: Každá hra může mít jen jeden checkpoint s daným order_index
  UNIQUE(game_id, order_index)
);

-- Indexy
CREATE INDEX idx_checkpoints_game ON public.checkpoints(game_id);
CREATE INDEX idx_checkpoints_order ON public.checkpoints(game_id, order_index);

-- Spatial index pro rychlé geolokační dotazy (pokud bychom používali PostGIS)
-- CREATE INDEX idx_checkpoints_location ON public.checkpoints USING GIST(ST_MakePoint(longitude, latitude));

-- ============================================================================
-- GAME_SESSIONS TABLE
-- ============================================================================
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  
  current_checkpoint_index INTEGER NOT NULL DEFAULT 0,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- Časové značky
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  
  -- Score/statistiky
  score INTEGER DEFAULT 0,
  
  -- Metadata (JSONB pro flexibilní rozšíření)
  metadata JSONB DEFAULT '{
    "hints_used": 0,
    "wrong_attempts": 0,
    "checkpoints_completed": []
  }'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_sessions_user ON public.game_sessions(user_id);
CREATE INDEX idx_sessions_game ON public.game_sessions(game_id);
CREATE INDEX idx_sessions_status ON public.game_sessions(status);
CREATE INDEX idx_sessions_active ON public.game_sessions(user_id, game_id) WHERE status = 'active';

-- Unique constraint: Jeden uživatel může mít jen jednu aktivní session pro danou hru
CREATE UNIQUE INDEX idx_sessions_unique_active ON public.game_sessions(user_id, game_id) WHERE status = 'active';

-- ============================================================================
-- CHECKPOINT_COMPLETIONS TABLE (volitelné - pro tracking jednotlivých kroků)
-- ============================================================================
CREATE TABLE public.checkpoint_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  
  -- Kdy hráč vstoupil do radiusu
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Kdy hráč splnil úkol
  completed_at TIMESTAMPTZ,
  
  -- Kolik pokusů potřeboval
  attempts INTEGER DEFAULT 0,
  
  -- GPS pozice při vstupu
  entry_latitude DOUBLE PRECISION,
  entry_longitude DOUBLE PRECISION,
  entry_accuracy DOUBLE PRECISION,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: Každý checkpoint může být v session splněn jen jednou
  UNIQUE(session_id, checkpoint_id)
);

CREATE INDEX idx_completions_session ON public.checkpoint_completions(session_id);
CREATE INDEX idx_completions_checkpoint ON public.checkpoint_completions(checkpoint_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Funkce pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggery pro všechny tabulky s updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkpoints_updated_at BEFORE UPDATE ON public.checkpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    -- Generovat default username z emailu (před @)
    SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::text, 1, 4)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pro vytvoření profilu při registraci
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- COMMENTS (dokumentace)
-- ============================================================================

COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE public.games IS 'Geolocation games created by users';
COMMENT ON TABLE public.checkpoints IS 'Points of interest in games';
COMMENT ON TABLE public.game_sessions IS 'Active game sessions for players';
COMMENT ON TABLE public.checkpoint_completions IS 'Individual checkpoint completion tracking';

COMMENT ON COLUMN public.games.settings IS 'Game configuration: radius_tolerance, allow_skip, max_players, time_limit';
COMMENT ON COLUMN public.checkpoints.secret_solution IS 'DMS coordinates for next checkpoint (lat/lng in separate objects)';
COMMENT ON COLUMN public.game_sessions.metadata IS 'Session stats: hints_used, wrong_attempts, checkpoints_completed';
