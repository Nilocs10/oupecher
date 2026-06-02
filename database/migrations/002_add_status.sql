-- Migration 002 : champ de modération sur les spots proposés
--
-- Valeurs possibles :
--   NULL     → spot hérité, visible sur la carte (comportement par défaut)
--   'pending' → soumis via le formulaire, invisible jusqu'à validation manuelle
--   'approved' → validé explicitement, visible sur la carte
--
-- Le backend affiche les spots WHERE status IS NULL OR status = 'approved'.
-- Mettre à jour un spot "pending" en "approved" suffit pour le faire apparaître.

ALTER TABLE water_bodies
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL
  CHECK (status IS NULL OR status IN ('pending', 'approved'));
