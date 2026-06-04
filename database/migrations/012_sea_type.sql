-- Migration 012 : ajout du type 'sea' (Mer / Plage) pour water_bodies

ALTER TABLE water_bodies
  DROP CONSTRAINT IF EXISTS water_bodies_type_check;

ALTER TABLE water_bodies
  ADD CONSTRAINT water_bodies_type_check
  CHECK (type IN ('river', 'lake', 'pond', 'canal', 'sea'));
