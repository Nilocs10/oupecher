-- Migration 011 : ajout du type 'permis' aux suggestions + droits admin

-- Étendre le CHECK sur spot_suggestions.type
ALTER TABLE spot_suggestions
  DROP CONSTRAINT IF EXISTS spot_suggestions_type_check;

ALTER TABLE spot_suggestions
  ADD CONSTRAINT spot_suggestions_type_check
  CHECK (type IN ('espece', 'technique', 'type_eau', 'permis'));

-- Admin peut créer des liaisons permis (approbation suggestion type='permis')
CREATE POLICY "Admin peut inserer liaisons permis" ON water_body_permits
  FOR INSERT WITH CHECK (auth.email() = 'nicolas.gomes10@hotmail.com');
