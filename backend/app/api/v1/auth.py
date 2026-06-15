from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
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
def register_customer(
    payload: CustomerRegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    return AuthService(db).register_customer(payload)


@router.post("/register/provider", response_model=TokenResponse, status_code=201)
def register_provider(
    payload: ProviderRegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    return AuthService(db).register_provider(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return AuthService(db).login(payload)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
