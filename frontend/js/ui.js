const panel        = document.getElementById("panel");
const panelTitle   = document.getElementById("panel-title");
const panelSubtitle = document.getElementById("panel-subtitle");
const panelBody    = document.getElementById("panel-body");
const panelClose   = document.getElementById("panel-close");

panelClose.addEventListener("click", closePanel);

function closePanel() {
  panel.classList.add("hidden");
}

async function openWaterBodyPanel(id, name) {
  panel.classList.remove("hidden");
  panelTitle.textContent = name;
  panelSubtitle.textContent = "Chargement…";
  panelBody.innerHTML = '<p class="panel-loading-text">Chargement des informations…</p>';
  updateFavBtn(id); // mise à jour non-bloquante du bouton favori

  try {
    const data = await getWaterBodyDetail(id);
    renderPanel(data);
    if (typeof loadRatings !== "undefined") loadRatings(data.id);
  } catch (err) {
    panelBody.innerHTML = `<p style="color:red">Erreur lors du chargement.</p>`;
    console.error(err);
  }
}

async function updateFavBtn(waterBodyId) {
  const btn = document.getElementById("fav-btn");
  if (!btn) return;

  // Si auth.js n'est pas chargé : bouton visible pointant vers login (jamais caché)
  if (typeof sbClient === "undefined") {
    btn.textContent = "♡";
    btn.title = "Connexion requise";
    btn.classList.remove("fav-btn--active");
    btn.onclick = () => { window.location.href = "login.html"; };
    return;
  }

  const { data: { session } } = await sbClient.auth.getSession();

  if (!session) {
    btn.textContent = "♡";
    btn.title = "Connectez-vous pour ajouter aux favoris";
    btn.classList.remove("fav-btn--active");
    btn.onclick = () => { window.location.href = "login.html"; };
    return;
  }

  // Attendre la fin du chargement initial des favoris (résout la race condition
  // quand le panneau s'ouvre via ?spot= au chargement de la page).
  if (typeof favoritesReady !== "undefined") {
    await favoritesReady();
  }

  const faved = typeof isFavorited !== "undefined" && isFavorited(waterBodyId);
  btn.textContent = faved ? "♥" : "♡";
  btn.title       = faved ? "Retirer des favoris" : "Ajouter aux favoris";
  btn.classList.toggle("fav-btn--active", faved);

  btn.onclick = async () => {
    btn.disabled = true;
    if (typeof toggleFavorite !== "undefined") {
      await toggleFavorite(waterBodyId);
      await updateFavBtn(waterBodyId);
    }
    btn.disabled = false;
  };
}

function renderPanel(wb) {
  const typeLabel = { river: "Rivière", lake: "Lac", pond: "Étang", canal: "Canal" };
  panelSubtitle.textContent =
    `${typeLabel[wb.type] ?? wb.type} • ${wb.country === "BE" ? "Belgique" : "France"}` +
    `${wb.region ? " – " + wb.region : ""}`;

  panelBody.innerHTML = `
    <div class="panel-tabs">
      <button class="tab-btn active" data-tab="info">Infos</button>
      <button class="tab-btn" data-tab="comments">Commentaires</button>
    </div>
    <div id="tab-info" class="tab-content active">${buildInfoHTML(wb)}</div>
    <div id="tab-comments" class="tab-content">
      <div id="comments-list"><p class="panel-loading-text">Cliquez sur l'onglet pour charger.</p></div>
      ${buildCommentFormHTML()}
    </div>
  `;

  // Changement d'onglet
  panelBody.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      panelBody.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      panelBody.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      if (btn.dataset.tab === "comments") loadComments(wb.id);
    });
  });

  // Soumission du formulaire commentaire
  document.getElementById("comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitComment(wb.id);
  });
}

function buildInfoHTML(wb) {
  const fishTags = (wb.fish_species || []).length
    ? wb.fish_species.map(f => `<span class="tag fish">${esc(f)}</span>`).join("")
    : "<em>Aucune espèce renseignée</em>";

  const techniqueTags = (wb.allowed_techniques || []).length
    ? wb.allowed_techniques.map(t => `<span class="tag technique">${esc(t)}</span>`).join("")
    : "<em>Toutes techniques légales</em>";

  const permitHTML = buildPermitHTML(wb);

  // Navigation GPS
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${wb.latitude},${wb.longitude}`;
  const waze  = `https://waze.com/ul?ll=${wb.latitude},${wb.longitude}&navigate=yes`;

  return `
    <div class="panel-section rating-section">
      <h3>Note</h3>
      <div class="rating-avg-row" id="rating-avg"><span class="rating-loading">Chargement…</span></div>
      <div class="rating-user-row" id="rating-user"></div>
    </div>
    <div class="panel-section">
      <h3>Espèces présentes</h3>
      <div class="tags">${fishTags}</div>
    </div>
    <div class="panel-section">
      <h3>Permis</h3>
      ${permitHTML}
    </div>
    <div class="panel-section">
      <h3>Techniques autorisées</h3>
      <div class="tags">${techniqueTags}</div>
    </div>
    <div class="panel-section">
      <h3>Itinéraire</h3>
      <div class="nav-btns">
        <a href="${gmaps}" target="_blank" rel="noopener noreferrer" class="nav-btn nav-btn--gmaps">Google Maps →</a>
        <a href="${waze}"  target="_blank" rel="noopener noreferrer" class="nav-btn nav-btn--waze">Waze →</a>
      </div>
    </div>
  `;
}

function buildPermitHTML(wb) {
  const permits = wb.permits || [];

  if (!wb.permit_required || !permits.length) {
    return `<span class="no-permit">✓ Aucun permis spécifique</span>`;
  }

  return permits.map(p => {
    const priceHTML = p.price_eur != null
      ? `<span class="permit-price">${p.price_eur.toFixed(2).replace(".", ",")} €</span>`
      : "";
    const linkHTML = p.url
      ? `<a class="permit-link" href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">Acheter ce permis →</a>`
      : "";
    return `
      <div class="permit-item">
        <span class="permit-badge">⚠ ${esc(p.name)}</span>
        ${p.description ? `<span class="permit-desc">${esc(p.description)}</span>` : ""}
        <div class="permit-footer">${priceHTML}${linkHTML}</div>
      </div>`;
  }).join("");
}

function safeUrl(url) {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") ? url : "#";
  } catch { return "#"; }
}

function buildCommentFormHTML() {
  return `
    <form id="comment-form" class="comment-form">
      <h3>Laisser un commentaire</h3>
      <input type="text" id="comment-author" placeholder="Votre prénom ou pseudo" maxlength="100" required>
      <textarea id="comment-content" rows="3" maxlength="1000" required
        placeholder="Accès, parking, végétation, place pour manger…"></textarea>
      <div id="comment-error" class="comment-error hidden"></div>
      <button type="submit" id="comment-submit">Publier</button>
    </form>
  `;
}

async function loadComments(waterBodyId) {
  const list = document.getElementById("comments-list");
  if (!list) return;
  list.innerHTML = '<p class="panel-loading-text">Chargement…</p>';
  try {
    const comments = await getComments(waterBodyId);
    if (!comments.length) {
      list.innerHTML = '<p class="comment-empty">Aucun commentaire pour l\'instant. Soyez le premier !</p>';
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-meta">
          <span class="comment-author">${esc(c.author_name)}</span>
          <span class="comment-date">${fmtDate(c.created_at)}</span>
        </div>
        <p class="comment-content">${esc(c.content)}</p>
      </div>
    `).join("");
  } catch {
    list.innerHTML = '<p class="comment-empty">Commentaires non disponibles.</p>';
  }
}

async function submitComment(waterBodyId) {
  const authorInput = document.getElementById("comment-author");
  const contentInput = document.getElementById("comment-content");
  const errorDiv    = document.getElementById("comment-error");
  const submitBtn   = document.getElementById("comment-submit");

  errorDiv.classList.add("hidden");

  try {
    submitBtn.textContent = "Envoi…";
    submitBtn.disabled = true;
    await createComment({
      water_body_id: waterBodyId,
      author_name:   authorInput.value.trim(),
      content:       contentInput.value.trim(),
    });
    authorInput.value  = "";
    contentInput.value = "";
    await loadComments(waterBodyId);
  } catch {
    errorDiv.textContent = "Impossible d'envoyer le commentaire. Vérifiez la connexion API.";
    errorDiv.classList.remove("hidden");
  } finally {
    submitBtn.textContent = "Publier";
    submitBtn.disabled = false;
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("fr-BE", {
    day: "numeric", month: "short", year: "numeric",
  });
}
