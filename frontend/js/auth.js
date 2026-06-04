// ── Supabase Auth — gestionnaire de session partagé ───────────────────────
// La clé anon est publique par conception (Supabase RLS contrôle les accès).
const _SB_URL  = "https://xggdrlytxplbfykdbhvz.supabase.co";
const _SB_ANON = "sb_publishable_J_Kn3EKBR5i1ZiPr1Acxzg_ri27kj1F";

const sbClient = window.supabase.createClient(_SB_URL, _SB_ANON);

const ADMIN_EMAIL = "nicolas.gomes10@hotmail.com";

// ── Mise à jour du bloc d'auth dans le header ──────────────────────────────
function renderAuthNav(navEl, session) {
  if (!navEl) return;
  if (session) {
    const name = session.user.user_metadata?.username
               || session.user.email.split("@")[0];
    // HIDE_FAV_LINK peut être défini sur favoris.html pour éviter l'auto-lien
    const favLink = (typeof HIDE_FAV_LINK === "undefined")
      ? `<a href="favoris.html" class="header-link">&#x2665; Mes favoris</a><span class="nav-sep" aria-hidden="true">|</span>`
      : "";
    const adminLink = session.user.email === ADMIN_EMAIL
      ? `<a href="admin.html" class="header-link" style="color:var(--color-primary,#22d3b8);font-size:0.78rem">Admin</a><span class="nav-sep" aria-hidden="true">|</span>`
      : "";
    navEl.innerHTML = `
      ${favLink}${adminLink}<span class="auth-name">${_esc(name)}</span>
      <span class="nav-sep" aria-hidden="true">|</span>
      <button class="auth-btn-logout" id="btn-logout">Déconnexion</button>
    `;
    document.getElementById("btn-logout").addEventListener("click", async () => {
      await sbClient.auth.signOut();
    });
  } else {
    const loginHref = typeof LOGIN_HREF !== "undefined" ? LOGIN_HREF : "login.html";
    navEl.innerHTML = `<a href="${loginHref}" class="auth-btn-login">Connexion</a>`;
  }
}

async function initAuthNav() {
  const navEl = document.getElementById("auth-nav");
  if (!navEl) return;

  const { data: { session } } = await sbClient.auth.getSession();
  renderAuthNav(navEl, session);

  sbClient.auth.onAuthStateChange((_event, session) => {
    renderAuthNav(navEl, session);
  });
}

function _esc(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", initAuthNav);
