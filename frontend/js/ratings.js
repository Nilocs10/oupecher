// ── Notation des spots (étoiles 1-5) ─────────────────────────────────────
// Dépend de sbClient (auth.js). Expose loadRatings(waterBodyId) pour ui.js.

async function getWaterBodyRating(waterBodyId) {
  if (typeof sbClient === "undefined") return { avg: null, count: 0 };
  const { data } = await sbClient
    .from("ratings")
    .select("rating")
    .eq("water_body_id", waterBodyId);
  if (!data?.length) return { avg: null, count: 0 };
  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
  return { avg: Math.round(avg * 10) / 10, count: data.length };
}

async function getUserRating(waterBodyId) {
  if (typeof sbClient === "undefined") return null;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) return null;
  const { data } = await sbClient
    .from("ratings")
    .select("rating")
    .eq("water_body_id", waterBodyId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  return data?.rating ?? null;
}

async function setRating(waterBodyId, stars) {
  if (typeof sbClient === "undefined") return false;
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) { window.location.href = "login.html"; return false; }
  const { error } = await sbClient.from("ratings").upsert(
    { user_id: session.user.id, water_body_id: Number(waterBodyId), rating: stars },
    { onConflict: "user_id,water_body_id" }
  );
  return !error;
}

// ── Rendu des étoiles en lecture seule ────────────────────────────────────
function renderAvgStars(el, avg, count) {
  if (!count) {
    el.innerHTML = `<span class="rating-none">Aucune note · Soyez le premier !</span>`;
    return;
  }
  const filled = Math.round(avg);
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += `<span class="star${i <= filled ? " star--filled" : ""}">${i <= filled ? "★" : "☆"}</span>`;
  }
  el.innerHTML = `
    <span class="stars-display">${stars}</span>
    <span class="rating-avg-value">${avg.toFixed(1)}</span>
    <span class="rating-count">${count} note${count > 1 ? "s" : ""}</span>
  `;
}

// ── Rendu des étoiles interactives ────────────────────────────────────────
function renderUserStars(el, waterBodyId, currentRating) {
  const cur = currentRating || 0;
  let starsHTML = `<span class="stars-input">`;
  for (let i = 1; i <= 5; i++) {
    starsHTML += `<button class="star-btn${i <= cur ? " star-btn--active" : ""}"
      data-star="${i}"
      title="${i} étoile${i > 1 ? "s" : ""}"
      aria-label="${i} étoile${i > 1 ? "s" : ""}">${i <= cur ? "★" : "☆"}</button>`;
  }
  starsHTML += `</span>`;

  el.innerHTML = `
    <span class="rating-user-label">${cur ? "Votre note" : "Notez ce spot"}</span>
    ${starsHTML}
  `;

  const container = el.querySelector(".stars-input");
  const btns = [...container.querySelectorAll(".star-btn")];
  container.dataset.current = String(cur);

  // Hover : illuminer jusqu'à l'étoile survolée
  btns.forEach(btn => {
    btn.addEventListener("mouseenter", () => {
      const n = parseInt(btn.dataset.star);
      btns.forEach((b, i) => {
        b.textContent = i + 1 <= n ? "★" : "☆";
        b.classList.toggle("star-btn--hover", i + 1 <= n);
      });
    });
  });

  // Mouseleave : revenir à la note actuelle
  container.addEventListener("mouseleave", () => {
    const saved = parseInt(container.dataset.current || "0");
    btns.forEach((b, i) => {
      b.textContent = i + 1 <= saved ? "★" : "☆";
      b.classList.remove("star-btn--hover");
    });
  });

  // Clic : enregistrer la note et rafraîchir
  btns.forEach(btn => {
    btn.addEventListener("click", async () => {
      const n = parseInt(btn.dataset.star);
      btns.forEach(b => b.disabled = true);
      container.dataset.current = String(n);
      await setRating(waterBodyId, n);
      loadRatings(waterBodyId);
    });
  });
}

// ── Point d'entrée appelé par ui.js après renderPanel() ───────────────────
async function loadRatings(waterBodyId) {
  const avgEl  = document.getElementById("rating-avg");
  const userEl = document.getElementById("rating-user");
  if (!avgEl || !userEl) return;

  // Chargement parallèle de la moyenne et de la note utilisateur
  const [{ avg, count }, userRating] = await Promise.all([
    getWaterBodyRating(waterBodyId),
    getUserRating(waterBodyId),
  ]);

  renderAvgStars(avgEl, avg, count);

  if (typeof sbClient === "undefined") { userEl.innerHTML = ""; return; }
  const { data: { session } } = await sbClient.auth.getSession();

  if (!session) {
    userEl.innerHTML = `<a href="login.html" class="rating-login-hint">Connectez-vous pour noter</a>`;
  } else {
    renderUserStars(userEl, waterBodyId, userRating);
  }
}
