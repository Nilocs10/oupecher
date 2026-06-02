from pydantic import BaseModel
from typing import Literal


class PermitInfo(BaseModel):
    id: int
    name: str
    country: str | None = None
    price_eur: float | None = None
    url: str | None = None

    class Config:
        from_attributes = True


class WaterBodyBase(BaseModel):
    name: str
    type: Literal["river", "lake", "pond", "canal"]
    country: Literal["BE", "FR"]
    region: str | None = None
    latitude: float
    longitude: float
    geojson: dict | None = None


class WaterBodyCreate(WaterBodyBase):
    fish_ids: list[int] = []
    free_fish_names: list[str] = []  # espèces saisies librement (option "Autre")
    permit_ids: list[int] = []
    techniques: list[str] = []


class WaterBody(WaterBodyBase):
    id: int
    status: str | None = None

    class Config:
        from_attributes = True


class WaterBodyWithDetails(WaterBody):
    fish_species: list[str] = []
    permit_required: bool = False
    permits: list[PermitInfo] = []
    allowed_techniques: list[str] = []
