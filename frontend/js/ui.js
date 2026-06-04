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
      <button class="tab-btn" data-tab="photos">Photos</button>
      <button class="tab-btn" data-tab="comments">Commentaires</button>
    </div>
    <div id="tab-info" class="tab-content active">${buildInfoHTML(wb)}</div>
    <div id="tab-photos" class="tab-content">
      <div id="photos-grid" class="photos-grid">
        <p class="panel-loading-text">Cliquez sur l'onglet pour charger.</p>
      </div>
      <div id="photos-upload"></div>
    </div>
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
      if (btn.dataset.tab === "photos" && typeof loadPhotos !== "undefined") {
        loadPhotos(wb.id,
          document.getElementById("photos-grid"),
          document.getElementById("photos-upload"));
      }
    });
  });

  // Soumission du formulaire commentaire
  document.getElementById("comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitComment(wb.id);
  });

  // Chargement différé du bouton Enrichir (nécessite auth)
  initEnrichSection(wb);
  initAdminDeleteBtn(wb);
}

async function initEnrichSection(wb) {
  const el = document.getElementById("enrich-section");
  if (!el || typeof sbClient === "undefined") return;

  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) return;  // bouton invisible si non connecté

  // Récupérer toutes les espèces disponibles
  let allFish = [];
  try { allFish = await getFishList(); } catch {}
  const existing = new Set(wb.fish_species || []);
  const newFish  = allFish.filter(f => !existing.has(f.name));
  const fishOptions = newFish
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .map(f => `<option value="${esc(f.name)}">${esc(f.name)}</option>`)
    .join("");

  el.innerHTML = `
    <div class="panel-section enrich-section">
      <button class="enrich-toggle" id="enrich-toggle" type="button">✏ Enrichir ce spot</button>
      <div id="enrich-form-wrapper" class="enrich-form-wrapper hidden">
        <div class="enrich-type-tabs">
          <button type="button" class="enrich-type-btn active" data-etype="espece">+ Espèce</button>
          <button type="button" class="enrich-type-btn" data-etype="technique">+ Technique</button>
          <button type="button" class="enrich-type-btn" data-etype="type_eau">Corriger le type</button>
        </div>
        <form id="enrich-form" novalidate>
          <div id="enrich-field-espece" class="enrich-field">
            <select id="enrich-fish-select">
              <option value="">Choisir une espèce manquante…</option>
              ${fishOptions}
            </select>
          </div>
          <div id="enrich-field-technique" class="enrich-field hidden">
            <input type="text" id="enrich-tech-input"
              placeholder="Ex : Pêche à la traîne, Float tube…" maxlength="100" autocomplete="off">
          </div>
          <div id="enrich-field-type_eau" class="enrich-field hidden">
            <select id="enrich-type-select">
              <option value="">Choisir le bon type…</option>
              <option value="river">Rivière</option>
              <option value="lake">Lac</option>
              <option value="pond">Étang</option>
              <option value="canal">Canal</option>
            </select>
          </div>
          <div id="enrich-msg" class="enrich-msg"></div>
          <button type="submit" id="enrich-submit" class="enrich-submit">Soumettre la suggestion</button>
        </form>
      </div>
    </div>
  `;

  let currentType = "espece";

  // Toggle ouverture/fermeture du formulaire
  el.querySelector("#enrich-toggle").addEventListener("click", () => {
    el.querySelector("#enrich-form-wrapper").classList.toggle("hidden");
  });

  // Sélection du type de suggestion
  el.querySelectorAll(".enrich-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentType = btn.dataset.etype;
      el.querySelectorAll(".enrich-type-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      el.querySelectorAll(".enrich-field").forEach(f => f.classList.add("hidden"));
      el.querySelector(`#enrich-field-${currentType}`).classList.remove("hidden");
      el.querySelector("#enrich-msg").textContent = "";
    });
  });

  // Soumission
  el.querySelector("#enrich-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl    = el.querySelector("#enrich-msg");
    const submitBtn = el.querySelector("#enrich-submit");

    let valeur = "";
    if (currentType === "espece")    valeur = el.querySelector("#enrich-fish-select").value;
    else if (currentType === "technique") valeur = el.querySelector("#enrich-tech-input").value.trim();
    else if (currentType === "type_eau")  valeur = el.querySelector("#enrich-type-select").value;

    if (!valeur) {
      msgEl.textContent = "Veuillez remplir le champ.";
      msgEl.className = "enrich-msg enrich-error";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi…";
    msgEl.textContent = "";

    const { data: { session: s } } = await sbClient.auth.getSession();
    const { error } = await sbClient.from("spot_suggestions").insert({
      water_body_id: wb.id,
      user_id:       s.user.id,
      type:          currentType,
      valeur,
    });

    if (error) {
      msgEl.textContent = "Erreur : " + error.message;
      msgEl.className = "enrich-msg enrich-error";
      submitBtn.disabled = false;
      submitBtn.textContent = "Soumettre la suggestion";
    } else {
      msgEl.textContent = "Suggestion envoyée, merci !";
      msgEl.className = "enrich-msg enrich-success";
      submitBtn.textContent = "Envoyé ✓";
    }
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
    <a href="spot.html?id=${wb.id}" class="btn-spot-page">Voir la fiche complète →</a>
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
    <div id="enrich-section"></div>
    <div id="admin-delete-section"></div>
  `;
}

function buildPermitHTML(wb) {
  const permits = wb.permits || [];
  const hasSociety = wb.private_society_name != null;

  if (!permits.length && !hasSociety) {
    return `<span class="no-permit">✓ Aucun permis spécifique</span>`;
  }

  let html = permits.map(p => {
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

  if (hasSociety) {
    const label = wb.private_society_name
      ? `Permis régional + ${esc(wb.private_society_name)}`
      : "Permis régional + société locale requise";
    html += `
      <div class="permit-item">
        <span class="permit-badge">⚠ ${label}</span>
      </div>`;
  }

  return html;
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

async function initAdminDeleteBtn(wb) {
  const el = document.getElementById("admin-delete-section");
  if (!el || typeof sbClient === "undefined") return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session || session.user.email !== ADMIN_EMAIL) return;

  el.innerHTML = `
    <div class="panel-section admin-delete-section">
      <button class="btn-admin-delete" id="admin-delete-btn">🗑 Supprimer ce spot</button>
      <div id="admin-delete-msg" class="enrich-msg"></div>
    </div>
  `;

  document.getElementById("admin-delete-btn").addEventListener("click", async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce spot ?")) return;
    const btn   = document.getElementById("admin-delete-btn");
    const msgEl = document.getElementById("admin-delete-msg");
    btn.disabled = true;
    btn.textContent = "Suppression…";

    const { error } = await sbClient.from("water_bodies").delete().eq("id", wb.id);
    if (error) {
      msgEl.textContent = "Erreur : " + error.message;
      msgEl.className = "enrich-msg enrich-error";
      btn.disabled = false;
      btn.textContent = "🗑 Supprimer ce spot";
      return;
    }

    closePanel();
    applyFilters();
  });
}
