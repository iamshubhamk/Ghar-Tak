from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GharTak API"
    environment: str = Field(default="local")
    debug: bool = Field(default=True)
    api_v1_prefix: str = "/api/v1"

    frontend_origin: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    mongodb_url: str = Field(default="mongodb://localhost:27017/ghartak")

    jwt_secret_key: str = "change-this-local-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_minutes: int = 60

    # Interim hotfix (AR-002): reset has no OTP, so it stays off unless enabled for local dev.
    password_reset_self_service_enabled: bool = False

    storage_backend: str = "local"
    local_upload_dir: Path = Path("uploads")
    upload_max_photo_bytes: int = 5 * 1024 * 1024
    upload_max_document_bytes: int = 10 * 1024 * 1024

    notification_backend: str = "in_app"
    payment_backend: str = "cash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
