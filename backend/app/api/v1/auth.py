from typing import Any

from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.auth import (
    CustomerRegisterRequest,
    LoginRequest,
    PasswordResetSubmitRequest,
    PasswordResetVerifyRequest,
    PasswordResetVerifyResponse,
    ProviderRegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/customer", response_model=TokenResponse, status_code=201)
async def register_customer(
    payload: CustomerRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
    return await AuthService(db).register_customer(payload)


@router.post("/register/provider", response_model=TokenResponse, status_code=201)
async def register_provider(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        return await AuthService(db).register_provider_form(form)

    body = await request.json()
    payload = ProviderRegisterRequest.model_validate(body)
    return await AuthService(db).register_provider(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> TokenResponse:
    return await AuthService(db).login(payload)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return current_user


@router.post("/password-reset/verify", response_model=PasswordResetVerifyResponse)
async def verify_password_reset_identity(
    payload: PasswordResetVerifyRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> PasswordResetVerifyResponse:
    return await AuthService(db).verify_password_reset_identity(payload)


@router.post("/password-reset", response_model=TokenResponse)
async def reset_password(
    payload: PasswordResetSubmitRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
    return await AuthService(db).reset_password(payload)

