// Couche hydrologique en deux niveaux :
//   Base   — Natural Earth 50m local (ne_rivers.js / ne_lakes.js) : grands fleuves, toujours visibles
//   Détail — Overpass API dynamique : ruisseaux, chargés uniquement au zoom ≥ 10 sur le viewport

const OVERPASS = "https://overpass-api.de/api/interpreter";
const ZOOM_DETAIL = 10;

let detailLayer = null;
let detailCtrl  = null;

// ── Utilitaires ────────────────────────────────────────────────────────────────

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function viewportBBox(map) {
  const b = map.getBounds();
  return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]
    .map(v => v.toFixed(4)).join(",");
}

async function fetchOverpass(query, signal) {
  const res = await fetch(
    OVERPASS + "?data=" + encodeURIComponent(query),
    {
      credentials: "omit",
      headers: { Accept: "application/json, */*" }, // évite le 406 sur certains proxies
      ...(signal ? { signal } : {}),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function styleBase(f) {
  const rank = f.properties?.scalerank ?? 8;
  const isArea = f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon";

  if (isArea) {
    return { color: "#2980b9", weight: 1.5, opacity: 0.8,
             fillColor: "#aed6f1", fillOpacity: 0.55 };
  }
  if (rank <= 2) return { color: "#2980b9", weight: 4,   opacity: 1,   fill: false };
  if (rank <= 4) return { color: "#2980b9", weight: 3,   opacity: 0.9, fill: false };
                 return { color: "#2980b9", weight: 2.5, opacity: 0.8, fill: false };
}

// Ruisseaux légèrement plus clairs pour se distinguer des grands fleuves NE50m
const DETAIL_STYLE = { color: "#5ba3d0", weight: 1.4, opacity: 0.7, fill: false };

// ── Niveau base : Natural Earth (chargement synchrone depuis globals JS) ───────

function loadBaseLayer(map) {
  const opts = { pane: "waterways", interactive: false, style: styleBase };

  if (typeof NE_RIVERS !== "undefined") {
    L.geoJSON(NE_RIVERS, opts).addTo(map);
    console.info(`[waterways] base : ${NE_RIVERS.features.length} rivières (NE 50m)`);
  } else {
    console.warn("[waterways] NE_RIVERS introuvable — ne_rivers.js chargé ?");
  }

  if (typeof NE_LAKES !== "undefined") {
    L.geoJSON(NE_LAKES, opts).addTo(map);
    console.info(`[waterways] base : ${NE_LAKES.features.length} lacs (NE 50m)`);
  }
}

// ── Niveau détail : Overpass (viewport, zoom ≥ 10) ────────────────────────────

async function refreshDetail(map) {
  if (map.getZoom() < ZOOM_DETAIL) {
    detailLayer?.remove();
    detailLayer = null;
    return;
  }

  // Annuler la requête précédente si encore en vol
  detailCtrl?.abort();
  detailCtrl = new AbortController();

  const query =
    `[out:geojson][timeout:20][bbox:${viewportBBox(map)}];` +
    `(way["waterway"~"^(stream|brook)$"];);` +
    `out geom;`;

  try {
    const geo = await fetchOverpass(query, detailCtrl.signal);
    detailLayer?.remove();
    detailLayer = L.geoJSON(geo, {
      pane: "waterways",
      interactive: false,
      style: DETAIL_STYLE,
    }).addTo(map);
    console.info(`[waterways] détail : ${geo.features.length} ruisseaux (zoom ${map.getZoom()})`);
  } catch (err) {
    if (err.name !== "AbortError") console.warn("[waterways] Overpass :", err.message);
  }
}

// ── Point d'entrée ─────────────────────────────────────────────────────────────

function loadWaterways(map) {
  if (!map.getPane("waterways")) {
    const pane = map.createPane("waterways");
    pane.style.zIndex = 250;
    pane.style.pointerEvents = "none";
  }

  // Niveau base : immédiat, pas de réseau
  loadBaseLayer(map);

  // Niveau détail : réagit aux changements de vue, debounced 700 ms
  const onViewChange = debounce(() => refreshDetail(map), 700);
  map.on("zoomend moveend", onViewChange);
}
