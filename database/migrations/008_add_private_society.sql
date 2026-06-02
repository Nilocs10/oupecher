-- Migration 008 : colonne private_society_name dans water_bodies
-- NULL  = aucune société privée requise
-- ''    = société privée requise (nom inconnu)
-- 'XYZ' = société privée requise, nom renseigné

ALTER TABLE water_bodies
  ADD COLUMN IF NOT EXISTS private_society_name TEXT;
