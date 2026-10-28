"""AR-006: refuse to boot outside local with the default/weak JWT secret or no database."""

import subprocess
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_JWT_SECRET, Settings

BACKEND_DIR = Path(__file__).resolve().parents[1]
STRONG_SECRET = "x" * 32 + "-a-long-random-looking-secret"


def make(**overrides) -> Settings:
    values = {"environment": "production", "jwt_secret_key": STRONG_SECRET}
    values.update(overrides)
    return Settings(_env_file=None, **values)


@pytest.mark.parametrize("environment", ["production", "staging", "Production", "prod", ""])
def test_default_secret_is_refused_outside_local(environment: str) -> None:
    with pytest.raises(ValidationError, match="still the default"):
        make(environment=environment, jwt_secret_key=DEFAULT_JWT_SECRET)


@pytest.mark.parametrize("secret", ["", "   ", "short", "x" * 31])
def test_empty_or_short_secret_is_refused_outside_local(secret: str) -> None:
    with pytest.raises(ValidationError, match="at least 32 characters"):
        make(jwt_secret_key=secret)


def test_empty_mongodb_url_is_refused_outside_local() -> None:
    with pytest.raises(ValidationError, match="MONGODB_URL is empty"):
        make(mongodb_url="  ")


def test_error_tells_the_operator_how_to_fix_it() -> None:
    with pytest.raises(ValidationError, match="secrets.token_urlsafe"):
        make(jwt_secret_key=DEFAULT_JWT_SECRET)


def test_strong_secret_boots_outside_local() -> None:
    assert make().environment == "production"
    assert make(jwt_secret_key="x" * 32).jwt_secret_key == "x" * 32


@pytest.mark.parametrize("environment", ["local", "LOCAL", " local "])
def test_local_accepts_the_default_secret(environment: str) -> None:
    settings = make(environment=environment, jwt_secret_key=DEFAULT_JWT_SECRET)

    assert settings.jwt_secret_key == DEFAULT_JWT_SECRET


def test_example_env_placeholder_cannot_be_used_as_is() -> None:
    placeholder = None
    for line in (BACKEND_DIR / ".env.example").read_text(encoding="utf-8").splitlines():
        if line.startswith("JWT_SECRET_KEY="):
            placeholder = line.split("=", 1)[1].strip().strip('"')
    assert placeholder
    with pytest.raises(ValidationError):
        make(jwt_secret_key=placeholder)


def import_app(tmp_path: Path, **env: str) -> subprocess.CompletedProcess:
    """Import the real app in a clean process, away from backend/.env."""
    clean_env = {"PYTHONPATH": str(BACKEND_DIR), "SYSTEMROOT": "C:\\Windows", **env}
    return subprocess.run(
        [sys.executable, "-c", "import app.main"],
        cwd=tmp_path,
        env=clean_env,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_app_does_not_start_in_production_with_the_default_secret(tmp_path: Path) -> None:
    result = import_app(tmp_path, ENVIRONMENT="production")

    assert result.returncode != 0
    assert "Refusing to start" in result.stderr
    assert "JWT_SECRET_KEY" in result.stderr


def test_app_starts_in_production_with_a_strong_secret(tmp_path: Path) -> None:
    result = import_app(tmp_path, ENVIRONMENT="production", JWT_SECRET_KEY=STRONG_SECRET)

    assert result.returncode == 0, result.stderr


def test_app_starts_locally_with_the_default_secret(tmp_path: Path) -> None:
    result = import_app(tmp_path, ENVIRONMENT="local")

    assert result.returncode == 0, result.stderr
