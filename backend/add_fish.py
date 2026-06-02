#!/usr/bin/env python3
"""
Insère les espèces de poissons manquantes dans la table fish de Supabase.
Idempotent : les espèces déjà présentes sont ignorées.

Usage (depuis le dossier backend/) :
    python add_fish.py

Prérequis : SUPABASE_URL et SUPABASE_SERVICE_KEY définis dans backend/.env
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

SPECIES = [
    "Carassin",
    "Épinoche",
    "Brème bordelière",
    "Tanche",
    "Loche franche",
    "Ide mélanote",
    "Rotengle",
    "Goujon",
    "Hotu",
    "Vandoise",
    "Aspe",
    "Grémille",
    "Ablette spirlin",
    "Chevaine",
    "Silure",
    "Perche soleil",
    "Écrevisse américaine",
    "Écrevisse de Louisiane",
    "Écrevisse signal",
    "Écrevisse turque",
]


def main() -> None:
    # Récupérer les noms déjà présents en une seule requête
    existing = supabase.table("fish").select("name").execute()
    existing_names = {row["name"] for row in (existing.data or [])}

    to_insert = [name for name in SPECIES if name not in existing_names]

    skipped = len(SPECIES) - len(to_insert)
    if skipped:
        print(f"{skipped} espèce(s) déjà présente(s) — ignorée(s).")

    if not to_insert:
        print("Aucune nouvelle espèce à insérer.")
        return

    print(f"Insertion de {len(to_insert)} nouvelle(s) espèce(s)…\n")
    result = supabase.table("fish").insert([{"name": n} for n in to_insert]).execute()

    print(f"{'ID':<5}  Nom")
    print("-" * 35)
    for row in result.data:
        print(f"[{row['id']:<3}]  {row['name']}")

    print(f"\nTerminé — {len(result.data)} espèce(s) insérée(s).")


if __name__ == "__main__":
    main()
