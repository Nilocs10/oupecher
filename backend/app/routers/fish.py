from fastapi import APIRouter, HTTPException
from app.database import supabase, supabase_admin
from app.schemas.fish import Fish, FishCreate

router = APIRouter()


@router.get("/", response_model=list[Fish])
def list_fish():
    response = supabase.table("fish").select("*").execute()
    return response.data


@router.get("/{fish_id}", response_model=Fish)
def get_fish(fish_id: int):
    response = supabase.table("fish").select("*").eq("id", fish_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Espèce introuvable")
    return response.data


@router.post("/", response_model=Fish, status_code=201)
def create_fish(fish: FishCreate):
    response = supabase_admin.table("fish").insert(fish.model_dump()).execute()
    return response.data[0]
