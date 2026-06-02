from pydantic import BaseModel


class PermitBase(BaseModel):
    name: str
    country: str
    description: str | None = None
    price_eur: float | None = None
    url: str | None = None


class PermitCreate(PermitBase):
    pass


class Permit(PermitBase):
    id: int

    class Config:
        from_attributes = True
