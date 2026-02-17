-- GeoQuest Database Schema
-- Migration 002: Row Level Security Policies
-- Description: Implements RLS for secure data access

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_completions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Každý může číst všechny veřejné profily
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Uživatel může upravovat jen svůj vlastní profil
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Uživatel může vložit jen svůj vlastní profil (obvykle pomocí triggeru)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- GAMES POLICIES
-- ============================================================================

-- Všichni mohou číst veřejné publikované hry
CREATE POLICY "Public published games are viewable by everyone"
  ON public.games
  FOR SELECT
  USING (
    is_public = true 
    AND status = 'published'
  );

-- Tvůrce může číst všechny své hry (včetně drafts)
CREATE POLICY "Creators can view their own games"
  ON public.games
  FOR SELECT
  USING (auth.uid() = creator_id);

-- Pouze přihlášení uživatelé mohou vytvářet hry
CREATE POLICY "Authenticated users can create games"
  ON public.games
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Tvůrce může upravovat jen své vlastní hry
CREATE POLICY "Creators can update their own games"
  ON public.games
  FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Tvůrce může smazat jen své vlastní hry
CREATE POLICY "Creators can delete their own games"
  ON public.games
  FOR DELETE
  USING (auth.uid() = creator_id);

-- ============================================================================
-- CHECKPOINTS POLICIES
-- ============================================================================

-- Checkpointy jsou viditelné pokud:
-- 1. Hra je veřejná a publikovaná, NEBO
-- 2. Uživatel je tvůrce hry
CREATE POLICY "Checkpoints are viewable based on game visibility"
  ON public.checkpoints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = checkpoints.game_id
      AND (
        (games.is_public = true AND games.status = 'published')
        OR games.creator_id = auth.uid()
      )
    )
  );

-- Pouze tvůrce hry může přidávat checkpointy
CREATE POLICY "Game creators can insert checkpoints"
  ON public.checkpoints
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND games.creator_id = auth.uid()
    )
  );

-- Pouze tvůrce hry může upravovat checkpointy
CREATE POLICY "Game creators can update checkpoints"
  ON public.checkpoints
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND games.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND games.creator_id = auth.uid()
    )
  );

-- Pouze tvůrce hry může mazat checkpointy
CREATE POLICY "Game creators can delete checkpoints"
  ON public.checkpoints
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND games.creator_id = auth.uid()
    )
  );

-- ============================================================================
-- GAME_SESSIONS POLICIES
-- ============================================================================

-- Uživatel může číst jen své vlastní sessions
CREATE POLICY "Users can view their own sessions"
  ON public.game_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Tvůrce hry může číst sessions své hry (pro statistiky)
CREATE POLICY "Game creators can view sessions of their games"
  ON public.game_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND games.creator_id = auth.uid()
    )
  );

-- Uživatel může vytvořit session pro veřejnou publikovanou hru
CREATE POLICY "Users can create sessions for public games"
  ON public.game_sessions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND games.is_public = true
      AND games.status = 'published'
    )
  );

-- Uživatel může upravovat jen své vlastní sessions
CREATE POLICY "Users can update their own sessions"
  ON public.game_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Uživatel může smazat jen své vlastní sessions
CREATE POLICY "Users can delete their own sessions"
  ON public.game_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CHECKPOINT_COMPLETIONS POLICIES
-- ============================================================================

-- Uživatel může číst completions ze své session
CREATE POLICY "Users can view completions from their sessions"
  ON public.checkpoint_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions
      WHERE game_sessions.id = session_id
      AND game_sessions.user_id = auth.uid()
    )
  );

-- Tvůrce hry může číst completions ze všech sessions své hry
CREATE POLICY "Game creators can view completions of their games"
  ON public.checkpoint_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions
      JOIN public.games ON games.id = game_sessions.game_id
      WHERE game_sessions.id = session_id
      AND games.creator_id = auth.uid()
    )
  );

-- Uživatel může vkládat completions do své session
CREATE POLICY "Users can insert completions to their sessions"
  ON public.checkpoint_completions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_sessions
      WHERE game_sessions.id = session_id
      AND game_sessions.user_id = auth.uid()
    )
  );

-- Uživatel může upravovat completions ze své session
CREATE POLICY "Users can update completions from their sessions"
  ON public.checkpoint_completions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions
      WHERE game_sessions.id = session_id
      AND game_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.game_sessions
      WHERE game_sessions.id = session_id
      AND game_sessions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Funkce pro kontrolu, zda je uživatel tvůrce hry
CREATE OR REPLACE FUNCTION public.is_game_creator(game_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.games
    WHERE id = game_id
    AND creator_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkce pro kontrolu, zda má uživatel přístup ke hře
CREATE OR REPLACE FUNCTION public.can_access_game(game_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.games
    WHERE id = game_id
    AND (
      (is_public = true AND status = 'published')
      OR creator_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Profiles are viewable by everyone" ON public.profiles IS 
  'All users can view all profiles for social features';

COMMENT ON POLICY "Public published games are viewable by everyone" ON public.games IS 
  'Public games in published status are visible to all users';

COMMENT ON POLICY "Creators can view their own games" ON public.games IS 
  'Game creators can see all their games including drafts and archived';

COMMENT ON FUNCTION public.is_game_creator IS 
  'Helper function to check if current user is the creator of a game';

COMMENT ON FUNCTION public.can_access_game IS 
  'Helper function to check if current user can access a game (public or owned)';
