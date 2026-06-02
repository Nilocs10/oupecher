#!/usr/bin/env python3
"""
Mise à jour des permis de pêche belges dans Supabase.

Usage (depuis le dossier backend/) :
    python add_permits.py

Prérequis : SUPABASE_SERVICE_KEY défini dans backend/.env
Note     : les anciens permis sont supprimés ; les liaisons water_body_permits
           sont automatiquement nettoyées par la contrainte CASCADE.
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

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erreur : SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant dans backend/.env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

PERMITS = [
    {
        "name": "Wallonie A",
        "country": "BE",
        "description": "Pêche de jour, 2 cannes maximum, depuis la rive uniquement",
        "price_eur": 20.00,
        "url": "https://www.peche.wallonie.be",
    },
    {
        "name": "Wallonie B",
        "country": "BE",
        "description": "Pêche de jour, 2 cannes maximum, wading autorisé",
        "price_eur": 12.39,
        "url": "https://www.peche.wallonie.be",
    },
    {
        "name": "Wallonie C",
        "country": "BE",
        "description": "Pêche jour et nuit, 3 cannes maximum, embarcation autorisée",
        "price_eur": 121.50,
        "url": "https://www.peche.wallonie.be",
    },
    {
        "name": "Flandre ordinaire",
        "country": "BE",
        "description": "Pêche de jour, 2 cannes maximum",
        "price_eur": 13.00,
        "url": "https://www.visverlof.be",
    },
    {
        "name": "Flandre grand permis",
        "country": "BE",
        "description": "Pêche jour et nuit, embarcation autorisée",
        "price_eur": 48.00,
        "url": "https://www.visverlof.be",
    },
    {
        "name": "Flandre jeunesse",
        "country": "BE",
        "description": "Moins de 17 ans, 1 canne maximum",
        "price_eur": 5.00,
        "url": "https://www.visverlof.be",
    },
]


def main() -> None:
    # Supprimer les permis existants (ON DELETE CASCADE nettoie water_body_permits)
    existing = supabase.table("permits").select("id").execute()
    if existing.data:
        ids = [r["id"] for r in existing.data]
        print(f"Suppression de {len(ids)} permis existant(s)…")
        supabase.table("permits").delete().in_("id", ids).execute()
    else:
        print("Aucun permis existant à supprimer.")

    # Insérer les nouveaux permis
    print(f"Insertion de {len(PERMITS)} permis belges…\n")
    result = supabase.table("permits").insert(PERMITS).execute()

    print(f"{'ID':<5} {'Nom':<25} {'Prix':>8}  {'Pays'}  Lien")
    print("-" * 65)
    for p in result.data:
        price = f"{p['price_eur']:.2f} €" if p.get("price_eur") is not None else "—"
        print(f"[{p['id']:<3}] {p['name']:<25} {price:>8}  {p['country']}   {p['url']}")

    print(f"\nTerminé — {len(result.data)} permis insérés.")


if __name__ == "__main__":
    main()
