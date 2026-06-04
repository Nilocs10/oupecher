-- Migration 010 : suggestions d'enrichissement des spots

CREATE TABLE spot_suggestions (
    id            SERIAL PRIMARY KEY,
    water_body_id INTEGER NOT NULL REFERENCES water_bodies(id) ON DELETE CASCADE,
    user_id       UUID    NOT NULL,
    type          TEXT    NOT NULL CHECK (type IN ('espece', 'technique', 'type_eau')),
    valeur        TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE spot_suggestions ENABLE ROW LEVEL SECURITY;

-- Utilisateurs authentifiés peuvent soumettre une suggestion
CREATE POLICY "Utilisateur soumet suggestions" ON spot_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin peut tout faire sur les suggestions
CREATE POLICY "Admin gere suggestions" ON spot_suggestions
  FOR ALL USING (auth.email() = 'nicolas.gomes10@hotmail.com');

-- Admin peut insérer des techniques (approbation type='technique')
CREATE POLICY "Admin peut inserer techniques" ON water_body_techniques
  FOR INSERT WITH CHECK (auth.email() = 'nicolas.gomes10@hotmail.com');
