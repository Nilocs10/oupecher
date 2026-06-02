from pydantic import BaseModel, field_validator
from datetime import datetime


class CommentCreate(BaseModel):
    water_body_id: int
    author_name: str
    content: str

    @field_validator("author_name", "content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Ce champ ne peut pas être vide")
        return v


class Comment(CommentCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
