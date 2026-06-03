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

_URL_WAL   = "https://permisdepeche.be/fr/home"
_URL_VLA   = "https://natuurenbos.vlaanderen.be/vissen-en-hengelen/visverlof/types-visverlof"
_URL_BXL   = "https://environnement.brussels/citoyen/reglementation-et-inspection/obligations-et-autorisations/pecher-bruxelles#le-permis-de-peche"

PERMITS = [
    # ── Wallonie ──────────────────────────────────────────────────────────────
    {
        "name": "Wallonie A",
        "country": "BE",
        "description": "Pêche de jour depuis la rive, max 2 lignes + épuisette + 5 balances.",
        "price_eur": 20.00,
        "url": _URL_WAL,
    },
    {
        "name": "Wallonie B",
        "country": "BE",
        "description": "Pêche de jour depuis la rive ou dans l'eau, max 2 lignes + épuisette + 5 balances.",
        "price_eur": 45.00,
        "url": _URL_WAL,
    },
    {
        "name": "Wallonie C",
        "country": "BE",
        "description": "Pêche de jour depuis la rive ou dans l'eau, max 2 lignes + épuisette + 5 balances + carpe nocturne.",
        "price_eur": 110.00,
        "url": _URL_WAL,
    },
    {
        "name": "Wallonie T",
        "country": "BE",
        "description": "Valable 14 jours consécutifs, mêmes droits que le permis B.",
        "price_eur": 25.00,
        "url": _URL_WAL,
    },
    # ── Flandre ───────────────────────────────────────────────────────────────
    {
        "name": "Flandre jeunesse",
        "country": "BE",
        "description": "Pour les moins de 17 ans, jour et nuit, rive et eau, sans appâts vivants.",
        "price_eur": 5.00,
        "url": _URL_VLA,
    },
    {
        "name": "Flandre simple",
        "country": "BE",
        "description": "Pêche de jour uniquement depuis la rive ou plateforme, sans appâts vivants.",
        "price_eur": 13.00,
        "url": _URL_VLA,
    },
    {
        "name": "Flandre grand permis",
        "country": "BE",
        "description": "Pêche jour et nuit, rive et eau, appâts vivants autorisés, max 5 poissons > 15 cm.",
        "price_eur": 48.00,
        "url": _URL_VLA,
    },
    # ── Bruxelles ─────────────────────────────────────────────────────────────
    {
        "name": "Bruxelles A",
        "country": "BE",
        "description": "Pêche de jour depuis la rive, 1 canne, sans appâts vivants.",
        "price_eur": 11.05,
        "url": _URL_BXL,
    },
    {
        "name": "Bruxelles B",
        "country": "BE",
        "description": "Pêche de jour depuis la rive, 2 cannes, appâts vivants autorisés.",
        "price_eur": 23.44,
        "url": _URL_BXL,
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
