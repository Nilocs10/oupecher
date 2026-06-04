const TYPE_COLORS = {
  river: "#1e3a8a",  // blue-900  — bleu foncé
  lake:  "#2563eb",  // blue-600  — bleu
  pond:  "#16a34a",  // green-600 — vert
  canal: "#7c3aed",  // violet-600 — violet
};

let map;
let markers        = [];
let pendingMarkers = [];

function initMap() {
  map = L.map("map").setView([50.5, 4.5], 7);

  // CartoDB Voyager — fond clair, rivières en bleu natif, routes discrètes, sans clé API
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
        '© <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(map);

  map.on("click", (e) => {
    if (typeof proposeMode !== "undefined" && proposeMode) {
      openProposeForm(e.latlng.lat, e.latlng.lng);
    } else {
      closePanel();
    }
  });
}

function addSpotMarker(wb) {
  const color = TYPE_COLORS[wb.type] ?? "#94a3b8";

  const marker = L.circleMarker([wb.latitude, wb.longitude], {
    radius: 9,
    color: "white",
    weight: 2,
    fillColor: color,
    fillOpacity: 0.92,
  }).addTo(map);

  marker.bindTooltip(wb.name, {
    direction: "top",
    offset: [0, -8],
    className: "dark-tooltip",
  });

  marker.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    openWaterBodyPanel(wb.id, wb.name);
  });

  markers.push(marker);
  return marker;
}

function addPendingSpotMarker(wb) {
  const icon = L.divIcon({
    className:   "",
    html:        `<div class="pending-marker">?</div>`,
    iconSize:    [22, 22],
    iconAnchor:  [11, 11],
  });

  const marker = L.marker([wb.latitude, wb.longitude], { icon }).addTo(map);
  marker._wbId = wb.id;

  marker.bindTooltip(`⏳ ${wb.name}`, {
    direction: "top",
    offset:    [0, -12],
    className: "dark-tooltip",
  });

  marker.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    if (typeof openPendingSpotPanel !== "undefined") openPendingSpotPanel(wb);
  });

  pendingMarkers.push(marker);
  return marker;
}

function removePendingMarker(id) {
  const idx = pendingMarkers.findIndex(m => m._wbId === id);
  if (idx !== -1) {
    pendingMarkers[idx].remove();
    pendingMarkers.splice(idx, 1);
  }
}

function clearPendingMarkers() {
  pendingMarkers.forEach(m => m.remove());
  pendingMarkers = [];
}

async function loadPendingSpots() {
  clearPendingMarkers();
  if (typeof sbClient === "undefined") return;

  const { data: spots, error } = await sbClient
    .from("water_bodies")
    .select("*")
    .eq("status", "pending");

  if (error || !spots?.length) return;

  // Espèces (requête séparée pour éviter les problèmes de FK)
  const ids = spots.map(s => s.id);
  let fishMap = {};
  const { data: fishLinks } = await sbClient
    .from("water_body_fish")
    .select("water_body_id, fish(name)")
    .in("water_body_id", ids);
  for (const row of (fishLinks || [])) {
    if (!fishMap[row.water_body_id]) fishMap[row.water_body_id] = [];
    if (row.fish?.name) fishMap[row.water_body_id].push(row.fish.name);
  }

  for (const spot of spots) {
    spot._fish = fishMap[spot.id] || [];
    addPendingSpotMarker(spot);
  }
}

function updateApiStatus() {
  const badge = document.getElementById("api-status");
  if (!badge) return;
  if (isApiConnected()) {
    badge.textContent = "● API en direct";
    badge.className = "api-badge live";
  } else {
    badge.textContent = "● Données de démo";
    badge.className = "api-badge demo";
  }
}

async function loadWaterBodies({ country, type, fish, technique, permit_id, favorites_only } = {}) {
  markers.forEach(m => m.remove());
  markers = [];

  const PAGE = 500;
  let offset = 0;

  try {
    while (true) {
      const batch = await getWaterBodies({ country, type, fish, technique, permit_id, limit: PAGE, offset });

      // Mise à jour du badge API dès la première réponse
      if (offset === 0) updateApiStatus();

      batch.forEach(wb => {
        if (favorites_only && typeof isFavorited === "function" && !isFavorited(wb.id)) return;
        addSpotMarker(wb);
      });
      offset += PAGE;

      if (batch.length < PAGE) break;  // dernière page
    }
  } catch (err) {
    console.error("Impossible de charger les cours d'eau :", err);
    if (offset === 0) updateApiStatus();
  }
}
