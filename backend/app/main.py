from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import fish, water_bodies, permits, comments

app = FastAPI(
    title="OùPêcher API",
    description="API pour la carte interactive de pêche en Belgique et France",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fish.router, prefix="/api/fish", tags=["Poissons"])
app.include_router(water_bodies.router, prefix="/api/water-bodies", tags=["Cours d'eau"])
app.include_router(permits.router, prefix="/api/permits", tags=["Permis"])
app.include_router(comments.router, prefix="/api/comments", tags=["Commentaires"])


@app.get("/")
def root():
    return {"message": "OùPêcher API", "version": "0.1.0"}
