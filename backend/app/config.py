from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str | None = None  # clé service_role (bypasse RLS)
    allowed_origins: str = "http://localhost:5500"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"  # tolère les variables inconnues (ex. SUPABASE_SERVICE_KEY)


settings = Settings()
