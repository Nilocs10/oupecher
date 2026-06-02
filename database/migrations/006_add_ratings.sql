-- Migration 006 : table ratings — une note (1-5) par utilisateur par spot
-- UNIQUE (user_id, water_body_id) : upsert possible pour modifier une note.
-- SELECT public pour calculer les moyennes sans auth.

CREATE TABLE IF NOT EXISTS ratings (
  id             SERIAL PRIMARY KEY,
  user_id        UUID     NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  water_body_id  INTEGER  NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, water_body_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_water_body_id ON ratings(water_body_id);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Lecture publique (nécessaire pour calculer les moyennes)
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
-- Insertion et mise à jour strictement limitées à son propre user_id
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_update" ON ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
