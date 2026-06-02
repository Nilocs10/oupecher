from supabase import create_client, Client
from app.config import settings

# Client public — clé anon, soumis au RLS, utilisé pour les lectures
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

# Client admin — clé service_role, bypasse le RLS, utilisé pour les écritures
_service_key = settings.supabase_service_key or settings.supabase_key
supabase_admin: Client = create_client(settings.supabase_url, _service_key)
