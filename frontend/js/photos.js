// ── Photos des spots ──────────────────────────────────────────────────────
// Dépend de sbClient (auth.js). Utilisable sur index.html et spot.html.

function _e(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function getPhotos(waterBodyId) {
  if (typeof sbClient === "undefined") return [];
  const { data } = await sbClient
    .from("photos")
    .select("id, url, caption, created_at")
    .eq("water_body_id", waterBodyId)
    .order("created_at", { ascending: false });
  return data || [];
}

async function uploadPhoto(waterBodyId, file, caption) {
  const { data: { session } } = await sbClient.auth.getSession();
  if (!session) { window.location.href = "login.html"; return null; }

  const ext      = file.name.split(".").pop().toLowerCase();
  const filename = `${session.user.id}/${waterBodyId}_${Date.now()}.${ext}`;

  const { error: upErr } = await sbClient.storage
    .from("spot-photos")
    .upload(filename, file, { contentType: file.type, cacheControl: "3600" });
  if (upErr) throw upErr;

  const { data: { publicUrl } } = sbClient.storage
    .from("spot-photos")
    .getPublicUrl(filename);

  const { error: dbErr } = await sbClient.from("photos").insert({
    water_body_id: Number(waterBodyId),
    user_id: session.user.id,
    url: publicUrl,
    caption: caption?.trim() || null,
  });
  if (dbErr) throw dbErr;
  return publicUrl;
}

// ── Rendu de la grille ────────────────────────────────────────────────────
function renderPhotoGrid(photos, gridEl) {
  if (!photos.length) {
    gridEl.innerHTML = `<p class="photos-empty">Aucune photo pour l'instant</p>`;
    return;
  }
  gridEl.innerHTML = photos.map(p => `
    <a class="photo-thumb" data-id="${p.id}" href="${_e(p.url)}" target="_blank" rel="noopener noreferrer"
       title="${p.caption ? _e(p.caption) : "Agrandir"}">
      <img src="${_e(p.url)}" alt="${p.caption ? _e(p.caption) : "Photo"}" loading="lazy">
      ${p.caption ? `<span class="photo-caption">${_e(p.caption)}</span>` : ""}
    </a>
  `).join("");
}

// ── Zone d'upload (si connecté) ───────────────────────────────────────────
function renderUploadUI(waterBodyId, gridEl, uploadAreaEl) {
  uploadAreaEl.innerHTML = `
    <label class="upload-btn">
      + Ajouter une photo
      <input type="file" accept="image/jpeg,image/png,image/webp" hidden>
    </label>
    <div class="photo-upload-form hidden">
      <input type="text" class="photo-caption-input" placeholder="Légende (optionnel)" maxlength="200">
      <div class="photo-upload-actions">
        <button class="photo-submit-btn">Publier</button>
        <button class="photo-cancel-btn" type="button">Annuler</button>
      </div>
      <div class="photo-error hidden"></div>
    </div>
  `;

  let selectedFile = null;
  const fileInput  = uploadAreaEl.querySelector("input[type=file]");
  const form       = uploadAreaEl.querySelector(".photo-upload-form");
  const captionIn  = uploadAreaEl.querySelector(".photo-caption-input");
  const submitBtn  = uploadAreaEl.querySelector(".photo-submit-btn");
  const cancelBtn  = uploadAreaEl.querySelector(".photo-cancel-btn");
  const errEl      = uploadAreaEl.querySelector(".photo-error");

  fileInput.addEventListener("change", e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      errEl.textContent = "Image trop lourde (max 6 Mo).";
      errEl.classList.remove("hidden");
      return;
    }
    errEl.classList.add("hidden");
    selectedFile = f;
    form.classList.remove("hidden");
  });

  cancelBtn.addEventListener("click", () => {
    selectedFile = null;
    fileInput.value = "";
    captionIn.value = "";
    form.classList.add("hidden");
    errEl.classList.add("hidden");
  });

  submitBtn.addEventListener("click", async () => {
    if (!selectedFile) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi…";
    errEl.classList.add("hidden");
    try {
      await uploadPhoto(waterBodyId, selectedFile, captionIn.value);
      selectedFile = null;
      fileInput.value = "";
      captionIn.value = "";
      form.classList.add("hidden");
      const photos = await getPhotos(waterBodyId);
      renderPhotoGrid(photos, gridEl);
    } catch {
      errEl.textContent = "Erreur lors de l'upload. Vérifiez le bucket Supabase.";
      errEl.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Publier";
    }
  });
}

// ── Point d'entrée principal ──────────────────────────────────────────────
async function loadPhotos(waterBodyId, gridEl, uploadAreaEl) {
  gridEl.innerHTML = `<p class="photos-loading">Chargement…</p>`;
  if (uploadAreaEl) uploadAreaEl.innerHTML = "";

  const photos = await getPhotos(waterBodyId);
  renderPhotoGrid(photos, gridEl);

  if (!uploadAreaEl) return;

  if (typeof sbClient === "undefined") return;
  const { data: { session } } = await sbClient.auth.getSession();
  if (session) {
    renderUploadUI(waterBodyId, gridEl, uploadAreaEl);
  } else {
    uploadAreaEl.innerHTML = `<a href="login.html" class="photo-login-hint">Connectez-vous pour ajouter une photo</a>`;
  }
}
