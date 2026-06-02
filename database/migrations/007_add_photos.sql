-- Migration 007 : table photos + bucket Supabase Storage

-- ── Table photos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photos (
  id             SERIAL PRIMARY KEY,
  water_body_id  INTEGER NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
  user_id        UUID    NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  url            TEXT    NOT NULL,
  caption        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_water_body_id ON photos(water_body_id);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos_select" ON photos FOR SELECT USING (true);
CREATE POLICY "photos_insert" ON photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photos_delete" ON photos FOR DELETE USING (auth.uid() = user_id);

-- ── Bucket Supabase Storage ────────────────────────────────────────────────
-- Crée (ou met à jour) le bucket public "spot-photos".
INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-photos', 'spot-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique (affichage des images)
CREATE POLICY "storage_photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'spot-photos');

-- Upload réservé aux utilisateurs connectés
CREATE POLICY "storage_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'spot-photos'
    AND auth.role() = 'authenticated'
  );

-- Suppression limitée au dossier de l'utilisateur (chemin : user_id/...)
CREATE POLICY "storage_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'spot-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
