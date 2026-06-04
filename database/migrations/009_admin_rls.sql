-- Migration 009 : droits de modération pour l'admin
-- L'administrateur (nicolas.gomes10@hotmail.com) peut approuver et supprimer
-- les spots en attente directement via le client Supabase JS (JWT vérifié par RLS).

CREATE POLICY "Admin peut modifier les spots" ON water_bodies
  FOR UPDATE
  USING     (auth.email() = 'nicolas.gomes10@hotmail.com')
  WITH CHECK (auth.email() = 'nicolas.gomes10@hotmail.com');

CREATE POLICY "Admin peut supprimer les spots" ON water_bodies
  FOR DELETE
  USING (auth.email() = 'nicolas.gomes10@hotmail.com');

-- Insertion dans water_body_fish nécessaire pour la fusion d'espèces
CREATE POLICY "Admin peut insérer des liaisons espèces" ON water_body_fish
  FOR INSERT
  WITH CHECK (auth.email() = 'nicolas.gomes10@hotmail.com');
