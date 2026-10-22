-- GeoQuest Database Schema
-- Migration 007: Tajemství checkpointů mimo klienta, atomické uložení hry, granty pro Data API
--
-- Motivace:
--  * Řešení úkolů (souřadnice dalšího bodu, odpověď na hádanku) dosud klient dostával
--    v plaintextu s každým checkpointem (`select *`), stačily DevTools. Nově jsou v tabulce
--    checkpoint_secrets, kterou čte jen tvůrce hry. Hráč dostává pouze SHA-256 hashe
--    normalizované odpovědi a ověřuje lokálně – funguje tak i offline (PWA v terénu).
--  * Uložení hry z editoru dosud běželo jako řada samostatných requestů (dvouprůchodové
--    přečíslování kvůli UNIQUE(game_id, order_index)); při chybě uprostřed zůstala DB
--    v půlce. Nově jedno RPC save_game_checkpoints v jedné transakci, UNIQUE je DEFERRABLE.
--  * Od 30. 10. 2026 Supabase nepřidává novým tabulkám granty pro Data API automaticky –
--    granty jsou proto explicitně zde, pro všechny tabulky (platí i pro `supabase db reset`).
--
-- Po aplikaci přegenerovat src/lib/database.types.ts (Supabase MCP / `supabase gen types`).
-- Normalizace hashů MUSÍ odpovídat src/utils/answerCheck.ts.

-- ============================================================================
-- 1. HASHOVACÍ FUNKCE (pgcrypto)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- SHA-256 textu v UTF-8 jako hex (shodné s crypto.subtle.digest('SHA-256') v prohlížeči).
-- Kontrolní vektor: sha256_hex('test') = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
CREATE OR REPLACE FUNCTION public.sha256_hex(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT
SET search_path = public, extensions
AS $$
  SELECT encode(digest(convert_to(p_text, 'UTF8'), 'sha256'), 'hex');
$$;

-- Hash odpovědi na hádanku: lower(trim(answer)); prázdná odpověď = NULL (bez řešení)
CREATE OR REPLACE FUNCTION public.puzzle_answer_hash(p_answer TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_answer IS NULL OR btrim(p_answer) = '' THEN NULL
    ELSE public.sha256_hex(lower(btrim(p_answer)))
  END;
$$;

-- Hash jedné DMS souřadnice {"degrees","minutes","seconds","direction"}:
-- celkový počet sekund se znaménkem (S/W záporné), sekundy zaokrouhlené na celé.
-- Klient díky tomu ověří toleranci ±1 s porovnáním tří hashů (n-1, n, n+1).
CREATE OR REPLACE FUNCTION public.dms_hash(p_dms JSONB)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN p_dms IS NULL OR jsonb_typeof(p_dms) <> 'object' THEN NULL
    ELSE public.sha256_hex((
      (CASE WHEN p_dms->>'direction' IN ('S', 'W') THEN -1 ELSE 1 END)
      * (
        round((p_dms->>'degrees')::numeric)::int * 3600
        + round((p_dms->>'minutes')::numeric)::int * 60
        + round((p_dms->>'seconds')::numeric)::int
      )
    )::text)
  END;
$$;

-- ============================================================================
-- 2. TABULKA S TAJEMSTVÍMI – ČTE A PÍŠE JEN TVŮRCE HRY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checkpoint_secrets (
  checkpoint_id UUID PRIMARY KEY REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  -- {"latitude": {degrees, minutes, seconds, direction}, "longitude": {...}}
  secret_solution JSONB,
  puzzle_answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.checkpoint_secrets IS 'Řešení úkolů checkpointů (plaintext) – přístup jen pro tvůrce hry; hráči dostávají hashe v checkpoints';

ALTER TABLE public.checkpoint_secrets ENABLE ROW LEVEL SECURITY;

-- Pomocná funkce pro RLS (SECURITY DEFINER, aby se neřetězily RLS politiky checkpoints → games)
CREATE OR REPLACE FUNCTION public.is_checkpoint_creator(p_checkpoint_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.checkpoints c
    JOIN public.games g ON g.id = c.game_id
    WHERE c.id = p_checkpoint_id
      AND g.creator_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Game creators manage checkpoint secrets" ON public.checkpoint_secrets;
CREATE POLICY "Game creators manage checkpoint secrets"
  ON public.checkpoint_secrets
  FOR ALL
  USING (public.is_checkpoint_creator(checkpoint_id))
  WITH CHECK (public.is_checkpoint_creator(checkpoint_id));

CREATE TRIGGER update_checkpoint_secrets_updated_at
  BEFORE UPDATE ON public.checkpoint_secrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. HASHE NA CHECKPOINTECH, PLNĚNÉ TRIGGEREM ZE SECRETS
-- ============================================================================
ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS answer_hash TEXT,
  ADD COLUMN IF NOT EXISTS solution_lat_hash TEXT,
  ADD COLUMN IF NOT EXISTS solution_lng_hash TEXT;

COMMENT ON COLUMN public.checkpoints.answer_hash IS 'SHA-256 normalizované odpovědi na hádanku (viz puzzle_answer_hash)';
COMMENT ON COLUMN public.checkpoints.solution_lat_hash IS 'SHA-256 celkových sekund zeměpisné šířky tajného řešení (viz dms_hash)';
COMMENT ON COLUMN public.checkpoints.solution_lng_hash IS 'SHA-256 celkových sekund zeměpisné délky tajného řešení (viz dms_hash)';

CREATE OR REPLACE FUNCTION public.sync_checkpoint_hashes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.checkpoints
    SET answer_hash = NULL, solution_lat_hash = NULL, solution_lng_hash = NULL
    WHERE id = OLD.checkpoint_id;
    RETURN OLD;
  END IF;

  UPDATE public.checkpoints
  SET answer_hash       = public.puzzle_answer_hash(NEW.puzzle_answer),
      solution_lat_hash = public.dms_hash(NEW.secret_solution->'latitude'),
      solution_lng_hash = public.dms_hash(NEW.secret_solution->'longitude')
  WHERE id = NEW.checkpoint_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_checkpoint_hashes() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_checkpoint_hashes ON public.checkpoint_secrets;
CREATE TRIGGER sync_checkpoint_hashes
  AFTER INSERT OR UPDATE OR DELETE ON public.checkpoint_secrets
  FOR EACH ROW EXECUTE FUNCTION public.sync_checkpoint_hashes();

-- ============================================================================
-- 4. PŘESUN STÁVAJÍCÍCH TAJEMSTVÍ (trigger rovnou spočítá hashe)
-- ============================================================================
INSERT INTO public.checkpoint_secrets (checkpoint_id, secret_solution, puzzle_answer)
SELECT id,
       secret_solution,
       NULLIF(btrim(content->>'puzzle_answer'), '')
FROM public.checkpoints
WHERE secret_solution IS NOT NULL
   OR NULLIF(btrim(content->>'puzzle_answer'), '') IS NOT NULL
ON CONFLICT (checkpoint_id) DO NOTHING;

UPDATE public.checkpoints
SET content = content - 'puzzle_answer'
WHERE content ? 'puzzle_answer';

ALTER TABLE public.checkpoints DROP COLUMN IF EXISTS secret_solution;

-- ============================================================================
-- 5. UNIQUE(game_id, order_index) ODLOŽENÝ NA KONEC TRANSAKCE
-- ============================================================================
-- Přeřazení checkpointů pak jde uložit prostými UPDATE bez dočasných indexů.
DO $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT con.conname INTO v_name
  FROM pg_constraint con
  WHERE con.conrelid = 'public.checkpoints'::regclass
    AND con.contype = 'u'
    AND array_length(con.conkey, 1) = 2
    AND con.conkey @> ARRAY[
      (SELECT attnum FROM pg_attribute WHERE attrelid = con.conrelid AND attname = 'game_id'),
      (SELECT attnum FROM pg_attribute WHERE attrelid = con.conrelid AND attname = 'order_index')
    ]::smallint[]
    AND NOT con.condeferrable;

  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.checkpoints DROP CONSTRAINT %I', v_name);
    ALTER TABLE public.checkpoints
      ADD CONSTRAINT checkpoints_game_id_order_index_key
      UNIQUE (game_id, order_index) DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- ============================================================================
-- 6. RPC: ULOŽENÍ VŠECH CHECKPOINTŮ HRY V JEDNÉ TRANSAKCI
-- ============================================================================
-- p_checkpoints: pole objektů
--   { id?: uuid, order_index, latitude, longitude, radius?, type, content, is_fake?,
--     secret_solution?: {latitude, longitude}, puzzle_answer?: text }
-- Checkpointy hry, které v poli nejsou, se smažou. Běží s právy volajícího (RLS platí),
-- tvůrce hry se navíc kontroluje explicitně kvůli srozumitelné chybě.
CREATE OR REPLACE FUNCTION public.save_game_checkpoints(p_game_id UUID, p_checkpoints JSONB)
RETURNS SETOF public.checkpoints
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item JSONB;
  v_id UUID;
  v_keep UUID[] := '{}';
  v_has_secret BOOLEAN;
BEGIN
  IF p_checkpoints IS NULL OR jsonb_typeof(p_checkpoints) <> 'array' THEN
    RAISE EXCEPTION 'p_checkpoints musí být pole' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.games WHERE id = p_game_id AND creator_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Hru může upravovat jen její tvůrce' USING ERRCODE = '42501';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_checkpoints) LOOP
    v_id := NULLIF(item->>'id', '')::uuid;

    IF v_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.checkpoints WHERE id = v_id AND game_id = p_game_id) THEN
      UPDATE public.checkpoints
      SET order_index = (item->>'order_index')::int,
          latitude    = (item->>'latitude')::double precision,
          longitude   = (item->>'longitude')::double precision,
          radius      = COALESCE((item->>'radius')::double precision, 10),
          type        = item->>'type',
          content     = COALESCE(item->'content', '{}'::jsonb),
          is_fake     = COALESCE((item->>'is_fake')::boolean, false)
      WHERE id = v_id;
    ELSE
      INSERT INTO public.checkpoints
        (game_id, order_index, latitude, longitude, radius, type, content, is_fake)
      VALUES (
        p_game_id,
        (item->>'order_index')::int,
        (item->>'latitude')::double precision,
        (item->>'longitude')::double precision,
        COALESCE((item->>'radius')::double precision, 10),
        item->>'type',
        COALESCE(item->'content', '{}'::jsonb),
        COALESCE((item->>'is_fake')::boolean, false)
      )
      RETURNING id INTO v_id;
    END IF;

    v_keep := array_append(v_keep, v_id);

    v_has_secret := jsonb_typeof(item->'secret_solution') = 'object'
                    OR NULLIF(btrim(item->>'puzzle_answer'), '') IS NOT NULL;

    IF v_has_secret THEN
      INSERT INTO public.checkpoint_secrets (checkpoint_id, secret_solution, puzzle_answer)
      VALUES (
        v_id,
        CASE WHEN jsonb_typeof(item->'secret_solution') = 'object' THEN item->'secret_solution' END,
        NULLIF(btrim(item->>'puzzle_answer'), '')
      )
      ON CONFLICT (checkpoint_id) DO UPDATE
        SET secret_solution = EXCLUDED.secret_solution,
            puzzle_answer   = EXCLUDED.puzzle_answer;
    ELSE
      DELETE FROM public.checkpoint_secrets WHERE checkpoint_id = v_id;
    END IF;
  END LOOP;

  DELETE FROM public.checkpoints
  WHERE game_id = p_game_id
    AND NOT (id = ANY (v_keep));

  RETURN QUERY
    SELECT * FROM public.checkpoints
    WHERE game_id = p_game_id
    ORDER BY order_index;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_game_checkpoints(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_game_checkpoints(UUID, JSONB) TO authenticated, service_role;

-- ============================================================================
-- 7. GRANTY PRO DATA API (explicitně, viz hlavička)
-- ============================================================================
-- anon: nepřihlášený hráč čte veřejné hry, jejich checkpointy a jména tvůrců (RLS omezí řádky)
GRANT SELECT ON public.games, public.checkpoints, public.profiles TO anon;

-- authenticated: vše, co RLS dovolí
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.games,
  public.checkpoints,
  public.checkpoint_secrets,
  public.game_sessions,
  public.checkpoint_completions,
  public.player_locations
TO authenticated;
GRANT SELECT ON public.active_players_view TO authenticated;

-- service_role: plný přístup (obchází RLS, ale ne práva k tabulce)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.games,
  public.checkpoints,
  public.checkpoint_secrets,
  public.game_sessions,
  public.checkpoint_completions,
  public.player_locations
TO service_role;
GRANT SELECT ON public.active_players_view TO service_role;
