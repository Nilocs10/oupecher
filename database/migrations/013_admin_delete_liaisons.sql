-- Migration 013 : droits DELETE admin sur les tables de liaison
-- Nécessaire pour supprimer espèces, permis et techniques directement depuis spot.html

CREATE POLICY "Admin peut supprimer liaisons especes" ON water_body_fish
  FOR DELETE USING (auth.email() = 'nicolas.gomes10@hotmail.com');

CREATE POLICY "Admin peut supprimer liaisons permis" ON water_body_permits
  FOR DELETE USING (auth.email() = 'nicolas.gomes10@hotmail.com');

CREATE POLICY "Admin peut supprimer techniques" ON water_body_techniques
  FOR DELETE USING (auth.email() = 'nicolas.gomes10@hotmail.com');
