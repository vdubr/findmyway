-- GeoQuest Database Schema
-- Migration 005: Player Locations for Real-time Tracking
-- Description: Adds player_locations table for real-time position sharing with game creator

-- ============================================================================
-- PLAYER_LOCATIONS TABLE
-- ============================================================================
-- Tabulka pro real-time sledovani pozice hracu
-- Pozice se aktualizuji prubezne behem hry a admin je vidi v mape
CREATE TABLE public.player_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Vazba na session (obsahuje user_id a game_id)
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  
  -- Aktualni pozice hrace
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy DOUBLE PRECISION, -- presnost GPS v metrech
  
  -- Aktualni checkpoint index ktery hrac hleda
  current_checkpoint_index INTEGER NOT NULL DEFAULT 0,
  
  -- Cas posledni aktualizace (pro detekci neaktivnich hracu)
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Kazda session muze mit jen jeden zaznam v player_locations
  UNIQUE(session_id)
);

-- Indexy pro efektivni dotazy
CREATE INDEX idx_player_locations_session ON public.player_locations(session_id);
CREATE INDEX idx_player_locations_last_seen ON public.player_locations(last_seen_at);

-- ============================================================================
-- RLS POLICIES FOR PLAYER_LOCATIONS
-- ============================================================================

-- Zapnout RLS
ALTER TABLE public.player_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Hrac muze vkladat/aktualizovat svou vlastni pozici
CREATE POLICY "Players can upsert own location"
  ON public.player_locations
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.game_sessions WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.game_sessions WHERE user_id = auth.uid()
    )
  );

-- Policy: Admin (creator hry) muze cist pozice hracu sve hry
CREATE POLICY "Game creator can view player locations"
  ON public.player_locations
  FOR SELECT
  USING (
    session_id IN (
      SELECT gs.id 
      FROM public.game_sessions gs
      JOIN public.games g ON gs.game_id = g.id
      WHERE g.creator_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_player_locations_updated_at 
  BEFORE UPDATE ON public.player_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME SUBSCRIPTION
-- ============================================================================

-- Povolit realtime pro tabulku player_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_locations;

-- ============================================================================
-- VIEW: Aktivni hraci s detaily pro admina
-- ============================================================================

CREATE OR REPLACE VIEW public.active_players_view AS
SELECT 
  pl.id,
  pl.session_id,
  pl.latitude,
  pl.longitude,
  pl.accuracy,
  pl.current_checkpoint_index,
  pl.last_seen_at,
  gs.game_id,
  gs.user_id,
  p.username,
  p.avatar_url,
  g.creator_id
FROM public.player_locations pl
JOIN public.game_sessions gs ON pl.session_id = gs.id
JOIN public.profiles p ON gs.user_id = p.id
JOIN public.games g ON gs.game_id = g.id
WHERE gs.status = 'active'
  AND pl.last_seen_at > NOW() - INTERVAL '5 minutes'; -- Pouze aktivni hraci (posledni aktivita < 5 min)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.player_locations IS 'Real-time player positions for live tracking by game creator';
COMMENT ON COLUMN public.player_locations.last_seen_at IS 'Timestamp of last position update, used to detect inactive players';
COMMENT ON VIEW public.active_players_view IS 'Active players with profile info for admin dashboard';
