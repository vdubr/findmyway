-- GeoQuest Database Schema
-- Migration 006: Bezpečnostní opravy a srovnání migrací s produkční DB
--
-- POZOR: produkční schéma bylo upravováno i mimo migrace (sloupce tags, is_fake).
-- Před aplikací porovnat s produkcí (`supabase db diff`). Všechny příkazy jsou idempotentní.

-- ============================================================================
-- 1. VIEW S POLOHAMI HRÁČŮ MUSÍ RESPEKTOVAT RLS VOLAJÍCÍHO
-- ============================================================================
-- Bez security_invoker běží view s právy vlastníka (postgres) a RLS na player_locations,
-- game_sessions ani games se neuplatní: kdokoli s anon klíčem přečte živé polohy všech
-- hráčů všech her. S security_invoker vidí tvůrce hry jen hráče svých her (politiky
-- "Game creator can view player locations" a "Game creators can view sessions of their games").
ALTER VIEW public.active_players_view SET (security_invoker = true);

-- ============================================================================
-- 2. TVŮRCE MŮŽE HRÁT VLASTNÍ HRU I JAKO DRAFT
-- ============================================================================
-- Tlačítko "Hrát" se zobrazuje i u draftu, INSERT session ale dosud vyžadoval
-- veřejnou publikovanou hru, takže tvůrce dostal chybu RLS.
DROP POLICY IF EXISTS "Users can create sessions for public games" ON public.game_sessions;

CREATE POLICY "Users can create sessions for public games"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND (
        (games.is_public = true AND games.status = 'published')
        OR games.creator_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 3. SLOUPCE, KTERÉ PRODUKCE MÁ, ALE MIGRACE NE
-- ============================================================================
-- Odpovídá src/lib/database.types.ts (generováno z produkce). Na produkci nic nezmění.
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.checkpoints ADD COLUMN IF NOT EXISTS is_fake BOOLEAN DEFAULT false;

-- ============================================================================
-- 4. SECURITY DEFINER FUNKCE S PEVNÝM search_path
-- ============================================================================
-- Bez pevného search_path může volající podstrčit vlastní objekty se stejným jménem.
-- Těla funkcí používají plně kvalifikované názvy (public.*, auth.uid()).
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.is_game_creator(UUID) SET search_path = public;
ALTER FUNCTION public.can_access_game(UUID) SET search_path = public;
