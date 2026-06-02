// ── Favoris — appels directs à Supabase (RLS enforce le scope utilisateur) ─
// Dépend de sbClient défini dans auth.js (chargé avant ce fichier).

const _favIds = new Set();

async function _session() {
  if (typeof sbClient === "undefined") return null;
  const { data: { session } } = await sbClient.auth.getSession();
  return session;
}

async function loadFavorites() {
  _favIds.clear();
  const session = await _session();
  if (!session) return;
  const { data } = await sbClient
    .from("favorites")
    .select("water_body_id");
  (data || []).forEach(r => _favIds.add(Number(r.water_body_id)));
}

function isFavorited(waterBodyId) {
  return _favIds.has(Number(waterBodyId));
}

// Renvoie true si ajouté, false si retiré.
// Redirige vers login.html si non connecté.
async function toggleFavorite(waterBodyId) {
  const session = await _session();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  const id = Number(waterBodyId);
  if (isFavorited(id)) {
    await sbClient.from("favorites")
      .delete()
      .eq("water_body_id", id);
    _favIds.delete(id);
    return false;
  } else {
    await sbClient.from("favorites")
      .insert({ user_id: session.user.id, water_body_id: id });
    _favIds.add(id);
    return true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof sbClient === "undefined") return;
  sbClient.auth.onAuthStateChange(() => loadFavorites());
  loadFavorites();
});
