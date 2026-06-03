const TYPE_COLORS = {
  river: "#1e3a8a",  // blue-900  — bleu foncé
  lake:  "#2563eb",  // blue-600  — bleu
  pond:  "#16a34a",  // green-600 — vert
  canal: "#7c3aed",  // violet-600 — violet
};

let map;
let markers = [];

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

async function loadWaterBodies({ country, type, fish, technique, permit_id } = {}) {
  markers.forEach(m => m.remove());
  markers = [];

  const PAGE = 500;
  let offset = 0;

  try {
    while (true) {
      const batch = await getWaterBodies({ country, type, fish, technique, permit_id, limit: PAGE, offset });

      // Mise à jour du badge API dès la première réponse
      if (offset === 0) updateApiStatus();

      batch.forEach(wb => addSpotMarker(wb));
      offset += PAGE;

      if (batch.length < PAGE) break;  // dernière page
    }
  } catch (err) {
    console.error("Impossible de charger les cours d'eau :", err);
    if (offset === 0) updateApiStatus();
  }
}
