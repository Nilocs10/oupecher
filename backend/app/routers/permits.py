from fastapi import APIRouter, HTTPException, Query
from app.database import supabase, supabase_admin
from app.schemas.permit import Permit, PermitCreate

router = APIRouter()


@router.get("/", response_model=list[Permit])
def list_permits(country: str | None = Query(None, description="Filtrer par pays (BE ou FR)")):
    query = supabase.table("permits").select("*")
    if country:
        query = query.eq("country", country.upper())
    return query.execute().data


@router.get("/{permit_id}", response_model=Permit)
def get_permit(permit_id: int):
    response = supabase.table("permits").select("*").eq("id", permit_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Permis introuvable")
    return response.data


@router.post("/", response_model=Permit, status_code=201)
def create_permit(permit: PermitCreate):
    response = supabase_admin.table("permits").insert(permit.model_dump()).execute()
    return response.data[0]
