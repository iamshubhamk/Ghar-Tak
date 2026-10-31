from typing import Any

from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.exceptions import RequestValidationError
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import ValidationError

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.errors import AppErrorCode, app_http_error
from app.db.session import get_db
from app.schemas.auth import (
    CustomerRegisterRequest,
    LoginRequest,
    LogoutRequest,
    PasswordResetSubmitRequest,
    PasswordResetVerifyRequest,
    PasswordResetVerifyResponse,
    ProviderRegisterRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.errors import ErrorResponse
from app.services.auth import AuthService
from app.services.sessions import SessionService

router = APIRouter(prefix="/auth", tags=["auth"])

CLIENT_HEADER_HELP = (
    "`mobile` gets a 30-day sliding / 90-day absolute refresh token; anything else (including "
    "`admin_web` or no header) gets the 12-hour admin one."
)


@router.post("/register/customer", response_model=TokenResponse, status_code=201)
async def register_customer(
    payload: CustomerRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    x_client: str | None = Header(default=None, description=CLIENT_HEADER_HELP),
) -> TokenResponse:
    token = await AuthService(db).register_customer(payload)
    return await SessionService(db).start_session(token, x_client)


@router.post("/register/provider", response_model=TokenResponse, status_code=201)
async def register_provider(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    x_client: str | None = Header(default=None, description=CLIENT_HEADER_HELP),
) -> TokenResponse:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        token = await AuthService(db).register_provider_form(form)
    else:
        body = await request.json()
        try:
            payload = ProviderRegisterRequest.model_validate(body)
        except ValidationError as error:
            # Answer 422 in the standard validation format instead of crashing with a 500.
            raise RequestValidationError(error.errors()) from error
        token = await AuthService(db).register_provider(payload)
    return await SessionService(db).start_session(token, x_client)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    x_client: str | None = Header(default=None, description=CLIENT_HEADER_HELP),
) -> TokenResponse:
    token = await AuthService(db).login(payload)
    return await SessionService(db).start_session(token, x_client)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    responses={
        401: {
            "model": ErrorResponse,
            "description": "AUTH_REFRESH_INVALID, AUTH_REFRESH_EXPIRED or AUTH_REFRESH_REUSED.",
        },
        403: {"model": ErrorResponse, "description": "The account is disabled (ACCOUNT_DISABLED)."},
    },
)
async def refresh(
    payload: RefreshRequest, db: AsyncIOMotorDatabase = Depends(get_db)
) -> TokenResponse:
    """Swap a refresh token for a new access + refresh pair. The old refresh token stops working
    (a retry within 60 seconds is tolerated for bad mobile connections)."""
    return await SessionService(db).refresh(payload.refresh_token)


@router.post("/logout", status_code=204)
async def logout(payload: LogoutRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> Response:
    """End this login (all tokens of the session) and optionally forget the push token.
    Always answers 204, even for an unknown token."""
    await SessionService(db).logout(payload.refresh_token, payload.push_token)
    return Response(status_code=204)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return current_user


RESET_DISABLED_RESPONSE: dict[int | str, dict[str, Any]] = {
    403: {
        "model": ErrorResponse,
        "description": "Self-service password reset is disabled (code PASSWORD_RESET_DISABLED).",
    }
}


def require_password_reset_enabled() -> None:
    # Runs before any DB lookup so known and unknown accounts get the same response.
    if not get_settings().password_reset_self_service_enabled:
        raise app_http_error(
            403,
            AppErrorCode.PASSWORD_RESET_DISABLED,
            "Password reset is not available in the app yet. Please contact GharTak support.",
        )


@router.post(
    "/password-reset/verify",
    response_model=PasswordResetVerifyResponse,
    responses=RESET_DISABLED_RESPONSE,
    dependencies=[Depends(require_password_reset_enabled)],
)
async def verify_password_reset_identity(
    payload: PasswordResetVerifyRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> PasswordResetVerifyResponse:
    return await AuthService(db).verify_password_reset_identity(payload)


@router.post(
    "/password-reset",
    response_model=TokenResponse,
    responses=RESET_DISABLED_RESPONSE,
    dependencies=[Depends(require_password_reset_enabled)],
)
async def reset_password(
    payload: PasswordResetSubmitRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    x_client: str | None = Header(default=None, description=CLIENT_HEADER_HELP),
) -> TokenResponse:
    token = await AuthService(db).reset_password(payload)
    return await SessionService(db).start_session(token, x_client)

