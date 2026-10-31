import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

logging.getLogger("passlib").setLevel(logging.ERROR)

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(subject: str, role: str, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    issued_at = datetime.now(UTC)
    expires_at = issued_at + (
        expires_delta or timedelta(minutes=settings.jwt_access_token_minutes)
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "typ": "access",
        "iat": issued_at,
        "jti": uuid.uuid4().hex,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()

    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
