-- Migration 003 : table commentaires pour les spots de pêche
-- Les commentaires permettent aux pêcheurs de partager des infos pratiques :
-- accès, parking, végétation, place pour manger, etc.

CREATE TABLE IF NOT EXISTS comments (
  id             SERIAL PRIMARY KEY,
  water_body_id  INTEGER NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
  author_name    TEXT NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 1 AND 100),
  content        TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 1000),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_water_body_id ON comments(water_body_id);

-- RLS : lecture et insertion publiques (pas d'authentification requise)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read"   ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (true);
