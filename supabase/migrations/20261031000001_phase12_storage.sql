-- ==============================================================================
-- Migration: Phase 12 Supabase Storage Configuration for Yaad
-- Description: Sets up private 'scene-snapshots' bucket with strict Row-Level Security
--              restricting storage access to each authenticated user's own folder.
-- ==============================================================================

-- 1. Create or update private bucket for scene snapshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scene-snapshots',
  'scene-snapshots',
  false,                     -- Private bucket: NO public anonymous access
  5242880,                   -- 5 MB max file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage RLS Policies
-- Folder Structure: {user_id}/{observation_id}/{filename}

-- Drop existing policies if they exist to allow clean re-runs
DROP POLICY IF EXISTS "Users can view their own scene snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own scene snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own scene snapshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own scene snapshots" ON storage.objects;

-- SELECT policy: Authenticated users can only read objects in their own {user_id} folder
CREATE POLICY "Users can view their own scene snapshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'scene-snapshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

-- INSERT policy: Authenticated users can only upload into their own {user_id} folder
CREATE POLICY "Users can upload their own scene snapshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scene-snapshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

-- UPDATE policy: Authenticated users can only update objects in their own {user_id} folder
CREATE POLICY "Users can update their own scene snapshots"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'scene-snapshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id = 'scene-snapshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

-- DELETE policy: Authenticated users can only delete objects in their own {user_id} folder
CREATE POLICY "Users can delete their own scene snapshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scene-snapshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR split_part(name, '/', 1) = auth.uid()::text
    )
  );

