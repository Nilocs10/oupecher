from pydantic import BaseModel


class FishBase(BaseModel):
    name: str
    scientific_name: str | None = None
    description: str | None = None
    min_size_cm: int | None = None
    image_url: str | None = None


class FishCreate(FishBase):
    pass


class Fish(FishBase):
    id: int

    class Config:
        from_attributes = True
