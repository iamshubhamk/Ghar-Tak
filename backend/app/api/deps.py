from collections.abc import Callable

from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.core.errors import AppErrorCode, app_http_error, forbidden
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise app_http_error(
            status.HTTP_401_UNAUTHORIZED,
            AppErrorCode.AUTH_REQUIRED,
            "Login required.",
        )

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise app_http_error(
            status.HTTP_401_UNAUTHORIZED,
            AppErrorCode.AUTH_REQUIRED,
            "Invalid or expired token.",
        )

    user = db.get(User, payload["sub"])
    if not user:
        raise app_http_error(
            status.HTTP_401_UNAUTHORIZED,
            AppErrorCode.AUTH_REQUIRED,
            "User not found.",
        )

    if not user.is_active:
        raise app_http_error(
            status.HTTP_403_FORBIDDEN,
            AppErrorCode.ACCOUNT_DISABLED,
            "Account is disabled.",
        )

    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    allowed_roles = {role.value for role in roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise forbidden()
        return current_user

    return dependency
