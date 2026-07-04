from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.auth import (
    CustomerRegisterRequest,
    LoginRequest,
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
    payload: ProviderRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TokenResponse:
    return await AuthService(db).register_provider(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> TokenResponse:
    return await AuthService(db).login(payload)


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return current_user
