-- GeoQuest Database Schema
-- Migration 003: Storage Buckets and Policies
-- Description: Setup storage buckets for checkpoint images and user avatars

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Bucket pro obrázky checkpointů
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checkpoint-images',
  'checkpoint-images',
  true,  -- Veřejně přístupné obrázky
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Bucket pro avatary uživatelů
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Veřejně přístupné avatary
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- ============================================================================
-- STORAGE POLICIES - CHECKPOINT IMAGES
-- ============================================================================

-- Všichni mohou číst checkpoint images
CREATE POLICY "Checkpoint images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'checkpoint-images');

-- Pouze tvůrci her mohou uploadovat checkpoint images
-- Format cesty: {game_id}/{checkpoint_id}/{filename}
CREATE POLICY "Game creators can upload checkpoint images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'checkpoint-images'
    AND auth.role() = 'authenticated'
    AND (
      -- Kontrola, že uživatel je tvůrce hry (extrahujeme game_id z path)
      EXISTS (
        SELECT 1 FROM public.games
        WHERE games.id::text = split_part(name, '/', 1)
        AND games.creator_id = auth.uid()
      )
    )
  );

-- Pouze tvůrci her mohou upravovat své checkpoint images
CREATE POLICY "Game creators can update checkpoint images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'checkpoint-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id::text = split_part(name, '/', 1)
      AND games.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'checkpoint-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id::text = split_part(name, '/', 1)
      AND games.creator_id = auth.uid()
    )
  );

-- Pouze tvůrci her mohou mazat své checkpoint images
CREATE POLICY "Game creators can delete checkpoint images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'checkpoint-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id::text = split_part(name, '/', 1)
      AND games.creator_id = auth.uid()
    )
  );

-- ============================================================================
-- STORAGE POLICIES - AVATARS
-- ============================================================================

-- Všichni mohou číst avatary
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- Uživatel může uploadovat jen svůj vlastní avatar
-- Format cesty: {user_id}/{filename}
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- Uživatel může upravovat jen svůj vlastní avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = split_part(name, '/', 1)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- Uživatel může mazat jen svůj vlastní avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

-- ============================================================================
-- HELPER FUNCTIONS FOR STORAGE
-- ============================================================================

-- Funkce pro generování URL pro checkpoint image
CREATE OR REPLACE FUNCTION public.get_checkpoint_image_url(
  game_id UUID,
  checkpoint_id UUID,
  filename TEXT
)
RETURNS TEXT AS $$
DECLARE
  bucket_name TEXT := 'checkpoint-images';
  file_path TEXT;
BEGIN
  file_path := game_id::text || '/' || checkpoint_id::text || '/' || filename;
  
  -- Vrátí veřejnou URL (na produkci použij Supabase URL)
  RETURN 'https://your-project.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- Funkce pro generování URL pro avatar
CREATE OR REPLACE FUNCTION public.get_avatar_url(
  user_id UUID,
  filename TEXT
)
RETURNS TEXT AS $$
DECLARE
  bucket_name TEXT := 'avatars';
  file_path TEXT;
BEGIN
  file_path := user_id::text || '/' || filename;
  
  RETURN 'https://your-project.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Checkpoint images are publicly accessible" ON storage.objects IS 
  'All checkpoint images are publicly viewable for gameplay';

COMMENT ON POLICY "Game creators can upload checkpoint images" ON storage.objects IS 
  'Only game creators can upload images to their game checkpoints';

COMMENT ON POLICY "Avatars are publicly accessible" ON storage.objects IS 
  'All user avatars are publicly viewable';

COMMENT ON POLICY "Users can upload their own avatar" ON storage.objects IS 
  'Users can only upload avatars to their own profile folder';
