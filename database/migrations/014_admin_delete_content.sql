-- Migration 014 : droits DELETE admin sur comments et photos

CREATE POLICY "Admin peut supprimer commentaires" ON comments
  FOR DELETE USING (auth.email() = 'nicolas.gomes10@hotmail.com');

CREATE POLICY "Admin peut supprimer photos" ON photos
  FOR DELETE USING (auth.email() = 'nicolas.gomes10@hotmail.com');
