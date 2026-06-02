-- Migration 004 : table profiles liée à auth.users (Supabase Auth)
-- Créée automatiquement à l'inscription via un trigger SECURITY DEFINER.

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL CHECK (char_length(trim(username)) BETWEEN 3 AND 30),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour éviter les doublons de pseudo
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON profiles (lower(username));

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read"        ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger : crée le profil dès l'inscription
-- Le username vient de raw_user_meta_data->>'username' (passé depuis le formulaire).
-- Fallback : partie locale de l'adresse email.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
