from fastapi import APIRouter, HTTPException, Query
from app.database import supabase, supabase_admin
from app.schemas.water_body import WaterBody, WaterBodyCreate, WaterBodyWithDetails, PermitInfo

router = APIRouter()


@router.get("/", response_model=list[WaterBody])
def list_water_bodies(
    country:   str | None = Query(None, description="Filtrer par pays (BE ou FR)"),
    type:      str | None = Query(None, description="Filtrer par type (river, lake, pond, canal)"),
    fish:      str | None = Query(None, description="Filtrer par espèce (nom exact)"),
    technique: str | None = Query(None, description="Mot-clé technique (ex: mouche, lancer, coup)"),
    permit_id: int | None = Query(None, description="Filtrer par permis (id entier)"),
):
    # Accumule les IDs éligibles depuis les tables de liaison.
    # None = pas de contrainte sur cette dimension.
    candidate_ids: set[int] | None = None

    if fish:
        fish_row = supabase.table("fish").select("id").eq("name", fish).execute()
        if not fish_row.data:
            return []
        fish_id = fish_row.data[0]["id"]
        links = (supabase.table("water_body_fish")
                 .select("water_body_id")
                 .eq("fish_id", fish_id)
                 .execute())
        candidate_ids = {r["water_body_id"] for r in links.data}
        if not candidate_ids:
            return []

    if technique:
        tech_links = (supabase.table("water_body_techniques")
                      .select("water_body_id")
                      .ilike("technique", f"%{technique}%")
                      .execute())
        tech_ids = {r["water_body_id"] for r in tech_links.data}
        candidate_ids = tech_ids if candidate_ids is None else candidate_ids & tech_ids
        if not candidate_ids:
            return []

    if permit_id:
        perm_links = (supabase.table("water_body_permits")
                      .select("water_body_id")
                      .eq("permit_id", permit_id)
                      .execute())
        perm_ids = {r["water_body_id"] for r in perm_links.data}
        candidate_ids = perm_ids if candidate_ids is None else candidate_ids & perm_ids
        if not candidate_ids:
            return []

    query = supabase.table("water_bodies").select("*")
    if country:
        query = query.eq("country", country.upper())
    if type:
        query = query.eq("type", type)
    if candidate_ids is not None:
        query = query.in_("id", list(candidate_ids))

    # Masquer uniquement les spots explicitement "pending".
    # OR gère : spots sans colonne status (migration non encore jouée → fallback),
    # spots avec status NULL (hérités), et spots "approved".
    try:
        return query.or_("status.is.null,status.eq.approved").execute().data
    except Exception:
        # Colonne status absente (migration non exécutée) : tout afficher
        return query.execute().data


@router.get("/{water_body_id}", response_model=WaterBodyWithDetails)
def get_water_body(water_body_id: int):
    response = (
        supabase.table("water_bodies")
        .select(
            "*, "
            "water_body_fish(fish(name)), "
            "water_body_permits(permits(id, name, country, price_eur, url)), "
            "water_body_techniques(technique)"
        )
        .eq("id", water_body_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Cours d'eau introuvable")
    data = response.data
    permit_rows = data.get("water_body_permits") or []
    permit_details = [
        PermitInfo(**row["permits"])
        for row in permit_rows
        if row.get("permits")
    ]
    return WaterBodyWithDetails(
        **{k: v for k, v in data.items() if k not in ("water_body_fish", "water_body_permits", "water_body_techniques")},
        fish_species=[row["fish"]["name"] for row in (data.get("water_body_fish") or [])],
        permit_required=bool(permit_rows),
        permits=permit_details,
        allowed_techniques=[row["technique"] for row in (data.get("water_body_techniques") or [])],
    )


@router.post("/", response_model=WaterBody, status_code=201)
def create_water_body(water_body: WaterBodyCreate):
    data = water_body.model_dump()
    fish_ids        = data.pop("fish_ids", [])
    free_fish_names = data.pop("free_fish_names", [])
    permit_ids      = data.pop("permit_ids", [])
    techniques      = data.pop("techniques", [])

    # Résoudre les espèces saisies librement : chercher ou créer dans la table fish
    for raw_name in free_fish_names:
        name = raw_name.strip()
        if not name:
            continue
        existing = supabase.table("fish").select("id").eq("name", name).execute()
        if existing.data:
            fish_ids.append(existing.data[0]["id"])
        else:
            new_fish = supabase_admin.table("fish").insert({"name": name}).execute()
            fish_ids.append(new_fish.data[0]["id"])

    data["status"] = "pending"  # toujours en attente après soumission via formulaire
    try:
        response = supabase_admin.table("water_bodies").insert(data).execute()
    except Exception:
        # Colonne status absente (migration 002 non jouée) : insérer sans status
        data.pop("status", None)
        response = supabase_admin.table("water_bodies").insert(data).execute()
    new_id = response.data[0]["id"]

    if fish_ids:
        supabase_admin.table("water_body_fish").insert(
            [{"water_body_id": new_id, "fish_id": fid} for fid in fish_ids]
        ).execute()

    if permit_ids:
        supabase_admin.table("water_body_permits").insert(
            [{"water_body_id": new_id, "permit_id": pid} for pid in permit_ids]
        ).execute()

    if techniques:
        supabase_admin.table("water_body_techniques").insert(
            [{"water_body_id": new_id, "technique": t} for t in techniques]
        ).execute()

    return response.data[0]
