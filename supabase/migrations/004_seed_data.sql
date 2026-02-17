-- GeoQuest Database Schema
-- Migration 004: Seed Data (Optional - for development/testing)
-- Description: Inserts sample data for testing

-- POZNÁMKA: Tuto migraci spusť pouze v development prostředí!
-- Pro produkci tento soubor NESPOUŠTĚJ.

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Vytvoříme testovacího uživatele (předpokládáme, že už máš uživatele v auth.users)
-- UUID musí odpovídat skutečnému uživateli z auth.users

-- Příklad: Pokud máš uživatele s ID '123e4567-e89b-12d3-a456-426614174000'
-- (nahraď skutečným UUID ze své Supabase Authentication)

-- Ukázková veřejná hra: "Praha - Staré Město"
INSERT INTO public.games (
  id,
  creator_id,
  title,
  description,
  is_public,
  difficulty,
  settings,
  status
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '123e4567-e89b-12d3-a456-426614174000', -- REPLACE with your user ID
  'Praha - Staré Město',
  'Objevuj historické památky v centru Prahy. Navštiv Staroměstské náměstí, Karlův most a další ikonická místa.',
  true,
  2, -- Lehká obtížnost
  '{
    "radius_tolerance": 15,
    "allow_skip": false,
    "max_players": null,
    "time_limit": 120
  }'::jsonb,
  'published'
);

-- Checkpoint 1: Staroměstské náměstí
INSERT INTO public.checkpoints (
  id,
  game_id,
  order_index,
  latitude,
  longitude,
  radius,
  type,
  content,
  secret_solution
) VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  0,
  50.0875,   -- Staroměstské náměstí
  14.4213,
  15,
  'info',
  '{
    "title": "Staroměstské náměstí",
    "description": "Vítej na Staroměstském náměstí! Najdi orloj a zapamatuj si, na kterou hodinu ukazují jeho ručičky.",
    "image_url": null,
    "clue": "Hledej věž s orlojem"
  }'::jsonb,
  '{
    "latitude": {
      "degrees": 50,
      "minutes": 5,
      "seconds": 9,
      "direction": "N"
    },
    "longitude": {
      "degrees": 14,
      "minutes": 25,
      "seconds": 2,
      "direction": "E"
    }
  }'::jsonb
);

-- Checkpoint 2: Karlův most
INSERT INTO public.checkpoints (
  id,
  game_id,
  order_index,
  latitude,
  longitude,
  radius,
  type,
  content,
  secret_solution
) VALUES (
  'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  1,
  50.0865,   -- Karlův most
  14.4115,
  20,
  'puzzle',
  '{
    "title": "Karlův most",
    "description": "Stojíš na legendárním Karlově mostě. Spočítej všechny sochy svatých na pravé straně mostu.",
    "image_url": null,
    "clue": "Odpověď ti dá souřadnice dalšího bodu"
  }'::jsonb,
  '{
    "latitude": {
      "degrees": 50,
      "minutes": 5,
      "seconds": 18,
      "direction": "N"
    },
    "longitude": {
      "degrees": 14,
      "minutes": 23,
      "seconds": 44,
      "direction": "E"
    }
  }'::jsonb
);

-- Checkpoint 3: Pražský hrad
INSERT INTO public.checkpoints (
  id,
  game_id,
  order_index,
  latitude,
  longitude,
  radius,
  type,
  content,
  secret_solution
) VALUES (
  'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  2,
  50.0903,   -- Pražský hrad
  14.4006,
  25,
  'input',
  '{
    "title": "Pražský hrad - Finále",
    "description": "Gratulujeme! Dostal ses až k Pražskému hradu. Toto je poslední checkpoint.",
    "image_url": null,
    "clue": null
  }'::jsonb,
  null  -- Poslední checkpoint nemá další řešení
);

-- ============================================================================
-- UKÁZKA: Private hra pro testování
-- ============================================================================

INSERT INTO public.games (
  id,
  creator_id,
  title,
  description,
  is_public,
  difficulty,
  settings,
  status
) VALUES (
  'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  '123e4567-e89b-12d3-a456-426614174000', -- REPLACE with your user ID
  'Test Game - Draft',
  'Toto je testovací hra ve stavu draft.',
  false,
  1,
  '{
    "radius_tolerance": 10,
    "allow_skip": true,
    "max_players": 5,
    "time_limit": 60
  }'::jsonb,
  'draft'
);

-- ============================================================================
-- VÝPIS - Kontrola vložených dat
-- ============================================================================

-- Zobrazit všechny hry
SELECT 
  id,
  title,
  is_public,
  status,
  difficulty,
  (SELECT COUNT(*) FROM checkpoints WHERE game_id = games.id) as checkpoint_count
FROM public.games;

-- Zobrazit všechny checkpointy první hry
SELECT 
  order_index,
  content->>'title' as title,
  latitude,
  longitude,
  radius,
  type
FROM public.checkpoints
WHERE game_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
ORDER BY order_index;

-- ============================================================================
-- CLEANUP (spusť pokud chceš smazat seed data)
-- ============================================================================

/*
DELETE FROM public.checkpoint_completions WHERE session_id IN (
  SELECT id FROM public.game_sessions WHERE game_id IN (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
  )
);

DELETE FROM public.game_sessions WHERE game_id IN (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
);

DELETE FROM public.checkpoints WHERE game_id IN (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
);

DELETE FROM public.games WHERE id IN (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
);
*/
