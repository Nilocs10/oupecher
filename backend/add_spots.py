#!/usr/bin/env python3
"""
Ajout de 4 spots de pêche sur canaux belges dans Supabase.
Usage (depuis le dossier backend/) :  python add_spots.py
"""

import os, sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()  # lit backend/.env si lancé depuis backend/

url = os.getenv("SUPABASE_URL")
# La service_role key bypasse le RLS — nécessaire pour les INSERT d'admin.
# Supabase → Settings → API → Project API keys → service_role (secret)
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    sys.exit("SUPABASE_URL / SUPABASE_SERVICE_KEY manquants dans .env")

if key == os.getenv("SUPABASE_KEY"):
    print("AVERTISSEMENT : SUPABASE_SERVICE_KEY absent, utilisation de la cle anon.")
    print("Les INSERT echoueront si RLS est actif. Ajoutez SUPABASE_SERVICE_KEY dans .env.\n")

sb = create_client(url, key)

# ─── Données ───────────────────────────────────────────────────────────────────
# Coordonnées GPS : approximatives — ajuster si nécessaire avec Google Maps / OSM.

SPOTS = [
    {
        "wb": {
            "name":      "Canal Charleroi-Bruxelles – Seneffe",
            "type":      "canal",
            "country":   "BE",
            "region":    "Hainaut",
            "latitude":  50.5185,
            "longitude": 4.2510,
        },
        "fish": [],
    },
    {
        "wb": {
            "name":      "Ancien Canal Charleroi-Bruxelles – Seneffe (Rue du Canal)",
            "type":      "canal",
            "country":   "BE",
            "region":    "Hainaut",
            "latitude":  50.5215,
            "longitude": 4.2625,
        },
        "fish": ["Perche"],
    },
    {
        "wb": {
            "name":      "Ancien Canal Charleroi-Bruxelles – Arquennes/Feluy",
            "type":      "canal",
            "country":   "BE",
            "region":    "Hainaut",
            "latitude":  50.5350,
            "longitude": 4.2900,
        },
        "fish": [],
    },
    {
        "wb": {
            "name":      "Canal Blaton-Nimy – Chièvre (Rue d'Ath)",
            "type":      "canal",
            "country":   "BE",
            "region":    "Hainaut",
            "latitude":  50.5960,
            "longitude": 3.8430,
        },
        "fish": ["Gardon", "Brème commune", "Perche", "Carpe commune"],
    },
]

# Espèces à créer si absentes — (name, scientific_name, min_size_cm)
NEW_FISH = {
    "Brème commune": ("Abramis brama", None),
}

# ─── Helpers ───────────────────────────────────────────────────────────────────

def get_wallonie_permit_id() -> int:
    res = (sb.table("permits")
             .select("id")
             .eq("country", "BE")
             .ilike("name", "%walloni%")
             .limit(1)
             .execute())
    if not res.data:
        sys.exit("Permis wallon introuvable — vérifier la table permits.")
    return res.data[0]["id"]

def get_or_create_fish(name: str) -> int:
    res = sb.table("fish").select("id").eq("name", name).execute()
    if res.data:
        return res.data[0]["id"]
    payload = {"name": name}
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
    return bool(
        sb.table("water_bodies").select("id").eq("name", name).execute().data
    )

# ─── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    permit_id = get_wallonie_permit_id()
    print(f"Permis wallon : id {permit_id}\n")

    for spot in SPOTS:
        name = spot["wb"]["name"]

        if spot_exists(name):
            print(f"[SKIP] {name!r}  (déjà présent)")
            continue

        # 1. Cours d'eau
        res = sb.table("water_bodies").insert(spot["wb"]).execute()
        wb_id = res.data[0]["id"]
        print(f"[OK]   {name!r}  →  id {wb_id}")

        # 2. Permis
        sb.table("water_body_permits").insert({
            "water_body_id": wb_id,
            "permit_id":     permit_id,
        }).execute()

        # 3. Espèces
        for fish_name in spot["fish"]:
            fish_id = get_or_create_fish(fish_name)
            sb.table("water_body_fish").insert({
                "water_body_id": wb_id,
                "fish_id":       fish_id,
            }).execute()
            print(f"    ↳ {fish_name!r}  (id {fish_id})")

    print("\nTerminé.")

if __name__ == "__main__":
    main()
