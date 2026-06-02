-- Migration 005 : table favorites — spots mis en favori par les utilisateurs connectés
-- Le RLS restreint chaque utilisateur à ses propres lignes.

CREATE TABLE IF NOT EXISTS favorites (
  id             SERIAL PRIMARY KEY,
  user_id        UUID    NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  water_body_id  INTEGER NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, water_body_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id        ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_water_body_id  ON favorites(water_body_id);

-- RLS : chaque utilisateur ne voit et ne modifie que ses propres favoris
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fav_select" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete" ON favorites FOR DELETE USING (auth.uid() = user_id);
