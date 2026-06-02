// En local (file:// ou localhost) → backend uvicorn ; en production → même origine
const API_BASE = (() => {
  const { hostname, protocol } = window.location;
  return protocol === "file:" || hostname === "localhost" || hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000/api"
    : "/api";
})();

const DEMO_WATER_BODIES = [
  {
    id: -1,
    name: "Ourthe à Hamoir",
    type: "river",
    country: "BE",
    region: "Liège",
    latitude: 50.4283,
    longitude: 5.5256,
    fish_species: ["Truite fario", "Ombre commun", "Chevesne", "Vairon"],
    permit_required: true,
    allowed_techniques: ["Pêche à la mouche", "Pêche au lancer léger", "Pêche au toc"],
  },
  {
    id: -2,
    name: "Meuse à Namur",
    type: "river",
    country: "BE",
    region: "Namur",
    latitude: 50.4673,
    longitude: 4.8697,
    fish_species: ["Sandre", "Brochet", "Barbeau fluviatile", "Carpe commune", "Gardon"],
    permit_required: true,
    allowed_techniques: ["Pêche au coup", "Pêche au lancer", "Pêche à la carpe", "Pêche aux leurres"],
  },
  {
    id: -3,
    name: "Lac de Butgenbach",
    type: "lake",
    country: "BE",
    region: "Liège",
    latitude: 50.4173,
    longitude: 6.2090,
    fish_species: ["Truite arc-en-ciel", "Truite fario", "Perche", "Brochet"],
    permit_required: true,
    allowed_techniques: ["Pêche à la mouche", "Pêche au lancer", "Pêche à la traîne"],
  },
];

let _apiConnected = false;

function isApiConnected() {
  return _apiConnected;
}

// credentials:'omit' est nécessaire pour que CORS accepte l'origine null (file://)
async function fetchJSON(path) {
  const res = await fetch(API_BASE + path, { credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getWaterBodies({ country, type, fish, technique, permit_id } = {}) {
  try {
    const params = new URLSearchParams();
    if (country)   params.set("country", country);
    if (type)      params.set("type", type);
    if (fish)      params.set("fish", fish);
    if (technique) params.set("technique", technique);
    if (permit_id) params.set("permit_id", permit_id);
    const qs = params.toString();
    const data = await fetchJSON(`/water-bodies${qs ? "?" + qs : ""}`);
    _apiConnected = true;
    return data;
  } catch {
    _apiConnected = false;
    let results = DEMO_WATER_BODIES;
    if (country)   results = results.filter(wb => wb.country === country);
    if (type)      results = results.filter(wb => wb.type === type);
    if (fish)      results = results.filter(wb => wb.fish_species?.includes(fish));
    if (technique) results = results.filter(wb =>
      wb.allowed_techniques?.some(t => t.toLowerCase().includes(technique.toLowerCase()))
    );
    // permit_id ignoré en mode démo (pas d'IDs réels dans les données locales)
    return results;
  }
}

async function getWaterBodyDetail(id) {
  if (id < 0) {
    const demo = DEMO_WATER_BODIES.find(wb => wb.id === id);
    if (demo) return demo;
  }
  return fetchJSON(`/water-bodies/${id}`);
}

async function getFishList() {
  return fetchJSON("/fish");
}

async function getPermits(country) {
  return fetchJSON(`/permits${country ? "?country=" + country : ""}`);
}

async function createWaterBody(payload) {
  const res = await fetch(API_BASE + "/water-bodies/", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getComments(waterBodyId) {
  return fetchJSON(`/comments?water_body_id=${waterBodyId}`);
}

async function createComment(payload) {
  const res = await fetch(API_BASE + "/comments/", {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
