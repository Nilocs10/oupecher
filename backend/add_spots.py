#!/usr/bin/env python3
"""
Insertion de 16 spots belges dans Supabase.
Usage (depuis le dossier backend/) :  python add_spots.py

Prérequis : SUPABASE_URL et SUPABASE_SERVICE_KEY dans backend/.env
"""

import os
import sys
from pathlib import Path

# Charger .env sans dépendance externe
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client  # noqa: E402

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    sys.exit("Erreur : SUPABASE_URL / SUPABASE_SERVICE_KEY manquants dans backend/.env")

sb = create_client(url, key)

# ── Normalisation des noms d'espèces vers les noms canoniques de la DB ────────
# Clé = nom utilisé dans SPOTS, valeur = nom exact dans la table fish.
FISH_NAME_MAP: dict[str, str] = {
    "Barbeau":  "Barbeau fluviatile",
    "Carpe":    "Carpe commune",
    "Chevaine": "Chevesne",
    "Ombre":    "Ombre commun",
    "Truite":   "Truite fario",
    # les autres (Brochet, Sandre, Perche, Gardon, Brème, Tanche) sont utilisés
    # tels quels — Brème et Tanche seront créés s'ils n'existent pas.
}

# Espèces à créer automatiquement si absentes de la DB
NEW_FISH: dict[str, tuple[str | None, int | None]] = {
    # nom: (scientific_name, min_size_cm)
    "Brème":   ("Abramis brama",    None),
    "Tanche":  ("Tinca tinca",      None),
}

# ── Spots ─────────────────────────────────────────────────────────────────────
SPOTS = [
    {
        "wb": {"name": "Canal du Centre La Louvière",     "type": "canal",  "country": "BE", "region": "Hainaut",            "latitude": 50.4731, "longitude": 4.1892},
        "fish": ["Sandre", "Brème", "Gardon"],
    },
    {
        "wb": {"name": "Sambre Namur",                    "type": "river",  "country": "BE", "region": "Namur",              "latitude": 50.4647, "longitude": 4.8617},
        "fish": ["Barbeau", "Chevaine", "Brochet"],
    },
    {
        "wb": {"name": "Meuse Namur",                     "type": "river",  "country": "BE", "region": "Namur",              "latitude": 50.4612, "longitude": 4.8583},
        "fish": ["Brochet", "Sandre", "Carpe"],
    },
    {
        "wb": {"name": "Lac de Bambois Fosses-la-Ville",  "type": "lake",   "country": "BE", "region": "Namur",              "latitude": 50.3847, "longitude": 4.6889},
        "fish": ["Carpe", "Brochet", "Perche"],
    },
    {
        "wb": {"name": "Étang de Virelles Chimay",        "type": "lake",   "country": "BE", "region": "Hainaut",            "latitude": 50.0731, "longitude": 4.3214},
        "fish": ["Carpe", "Brochet", "Tanche"],
    },
    {
        "wb": {"name": "Donkmeer Berlare",                "type": "lake",   "country": "BE", "region": "Flandre Orientale",  "latitude": 51.0247, "longitude": 3.9931},
        "fish": ["Carpe", "Sandre", "Brème"],
    },
    {
        "wb": {"name": "Lac de Naninne Namur",            "type": "lake",   "country": "BE", "region": "Namur",              "latitude": 50.4156, "longitude": 4.8923},
        "fish": ["Carpe", "Perche", "Gardon"],
    },
    {
        "wb": {"name": "Leie Gand",                       "type": "river",  "country": "BE", "region": "Flandre Orientale",  "latitude": 51.0543, "longitude": 3.7218},
        "fish": ["Brochet", "Sandre", "Brème"],
    },
    {
        "wb": {"name": "Canal Gand-Bruges Aalter",        "type": "canal",  "country": "BE", "region": "Flandre Occidentale","latitude": 51.0789, "longitude": 3.4512},
        "fish": ["Sandre", "Brème", "Carpe"],
    },
    {
        "wb": {"name": "Schulensmeer Hasselt",            "type": "lake",   "country": "BE", "region": "Limbourg",           "latitude": 50.9823, "longitude": 5.1847},
        "fish": ["Carpe", "Brochet", "Perche"],
    },
    {
        "wb": {"name": "Ourthe La Roche-en-Ardenne",      "type": "river",  "country": "BE", "region": "Luxembourg",         "latitude": 50.1847, "longitude": 5.5712},
        "fish": ["Truite", "Ombre", "Chevaine"],
    },
    {
        "wb": {"name": "Semois Bouillon",                 "type": "river",  "country": "BE", "region": "Luxembourg",         "latitude": 49.7923, "longitude": 5.0647},
        "fish": ["Truite", "Barbeau", "Chevaine"],
    },
    {
        "wb": {"name": "Lac de Nisramont Houffalize",     "type": "lake",   "country": "BE", "region": "Luxembourg",         "latitude": 50.1423, "longitude": 5.7389},
        "fish": ["Truite", "Perche", "Brochet"],
    },
    {
        "wb": {"name": "Amblève Trois-Ponts",             "type": "river",  "country": "BE", "region": "Liège",              "latitude": 50.3612, "longitude": 5.8723},
        "fish": ["Truite", "Ombre", "Barbeau"],
    },
    {
        "wb": {"name": "Vesdre Liège",                    "type": "river",  "country": "BE", "region": "Liège",              "latitude": 50.6123, "longitude": 5.5847},
        "fish": ["Barbeau", "Chevaine", "Truite"],
    },
    {
        "wb": {"name": "Lac de l'Eau d'Heure",            "type": "lake",   "country": "BE", "region": "Hainaut",            "latitude": 50.1833, "longitude": 4.3667},
        "fish": ["Carpe", "Brochet", "Sandre", "Perche", "Brème"],
    },
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def resolve_fish_name(name: str) -> str:
    return FISH_NAME_MAP.get(name, name)

def get_or_create_fish(raw_name: str) -> int:
    name = resolve_fish_name(raw_name)
    res = sb.table("fish").select("id").eq("name", name).execute()
    if res.data:
        return res.data[0]["id"]
    payload: dict = {"name": name}
    if name in NEW_FISH:
        sci, minsz = NEW_FISH[name]
        if sci:
            payload["scientific_name"] = sci
        if minsz is not None:
            payload["min_size_cm"] = minsz
    new = sb.table("fish").insert(payload).execute()
    fid = new.data[0]["id"]
    print(f"    + Espèce créée  : {name!r}  (id {fid})")
    return fid

def spot_exists(name: str) -> bool:
    return bool(sb.table("water_bodies").select("id").eq("name", name).execute().data)

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    inserted = skipped = 0

    for spot in SPOTS:
        name = spot["wb"]["name"]

        if spot_exists(name):
            print(f"[SKIP] {name!r}  (déjà présent)")
            skipped += 1
            continue

        # 1. Cours d'eau
        res = sb.table("water_bodies").insert(spot["wb"]).execute()
        wb_id = res.data[0]["id"]
        print(f"[OK]   {name!r}  ->  id {wb_id}")

        # 2. Espèces
        for raw_name in spot["fish"]:
            fish_id = get_or_create_fish(raw_name)
            sb.table("water_body_fish").insert({
                "water_body_id": wb_id,
                "fish_id":       fish_id,
            }).execute()
            canonical = resolve_fish_name(raw_name)
            print(f"      - {canonical!r}  (id {fish_id})")

        inserted += 1

    print(f"\nTerminé — {inserted} spot(s) inséré(s), {skipped} ignoré(s).")


if __name__ == "__main__":
    main()
