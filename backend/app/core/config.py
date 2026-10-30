from datetime import datetime
from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "change-this-local-secret"
MIN_JWT_SECRET_LENGTH = 32


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

    storage_backend: str = "local"  # "local" or "r2" (Cloudflare R2, T1-13)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    r2_endpoint_url: str = ""  # optional; defaults to https://<account id>.r2.cloudflarestorage.com
    signed_url_ttl_seconds: int = Field(default=300, ge=30, le=3600)
    local_upload_dir: Path = Path("uploads")
    upload_max_photo_bytes: int = 5 * 1024 * 1024
    upload_max_document_bytes: int = 10 * 1024 * 1024

    # Launch offer (T1-08): every booking costs this visit charge; the provider may add an extra.
    launch_visit_charge_inr: float = Field(default=99.0, ge=0)
    launch_offer_ends_at: datetime | None = None

    notification_backend: str = "in_app"
    payment_backend: str = "cash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @model_validator(mode="after")
    def require_r2_settings_when_selected(self) -> "Settings":
        if self.storage_backend.strip().lower() != "r2":
            return self
        missing = [
            name
            for name, value in (
                ("R2_ACCESS_KEY_ID", self.r2_access_key_id),
                ("R2_SECRET_ACCESS_KEY", self.r2_secret_access_key),
                ("R2_BUCKET", self.r2_bucket),
            )
            if not value.strip()
        ]
        if not (self.r2_endpoint_url.strip() or self.r2_account_id.strip()):
            missing.append("R2_ACCOUNT_ID (or R2_ENDPOINT_URL)")
        if missing:
            raise ValueError("STORAGE_BACKEND=r2 needs: " + ", ".join(missing))
        return self

    @property
    def r2_endpoint(self) -> str:
        if self.r2_endpoint_url.strip():
            return self.r2_endpoint_url.strip()
        return f"https://{self.r2_account_id.strip()}.r2.cloudflarestorage.com"

    @model_validator(mode="after")
    def refuse_unsafe_config_outside_local(self) -> "Settings":
        """AR-006: a deployed server must never start with a guessable JWT secret or no database."""
        if self.environment.strip().lower() == "local":
            return self

        problems = []
        secret = self.jwt_secret_key.strip()
        if secret == DEFAULT_JWT_SECRET:
            problems.append("JWT_SECRET_KEY is still the default value")
        elif len(secret) < MIN_JWT_SECRET_LENGTH:
            problems.append(f"JWT_SECRET_KEY must be at least {MIN_JWT_SECRET_LENGTH} characters")
        if not self.mongodb_url.strip():
            problems.append("MONGODB_URL is empty")
        if problems:
            raise ValueError(
                f"Refusing to start with ENVIRONMENT={self.environment!r}: "
                + "; ".join(problems)
                + ". Set a strong JWT_SECRET_KEY, for example: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
