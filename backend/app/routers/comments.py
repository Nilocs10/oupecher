from fastapi import APIRouter, Query
from app.database import supabase, supabase_admin
from app.schemas.comment import Comment, CommentCreate

router = APIRouter()


@router.get("/", response_model=list[Comment])
def list_comments(water_body_id: int = Query(..., description="ID du cours d'eau")):
    return (
        supabase.table("comments")
        .select("*")
        .eq("water_body_id", water_body_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )


@router.post("/", response_model=Comment, status_code=201)
def create_comment(comment: CommentCreate):
    response = supabase_admin.table("comments").insert(comment.model_dump()).execute()
    return response.data[0]
