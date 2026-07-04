from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole, VerificationStatus
from app.db.session import get_db
from app.models.user import User
from app.schemas.provider import (
    AvailabilityUpdateRequest,
    ProviderProfileUpdateRequest,
    ProviderPublicResponse,
    ProviderVerificationActionRequest,
)
from app.services.providers import ProviderService

router = APIRouter(tags=["providers"])


@router.get("/provider/me", response_model=ProviderPublicResponse)
def get_provider_me(
    current_user: User = Depends(require_roles(UserRole.PROVIDER)),
    db: Session = Depends(get_db),
):
    provider = ProviderService(db).get_provider_profile_for_user(current_user)
    return ProviderService.serialize(provider)


@router.get("/providers", response_model=list[ProviderPublicResponse])
def list_public_providers(
    category_id: str | None = Query(default=None),
    locality: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    providers = ProviderService(db).list_public(category_id=category_id, locality=locality)
    return [ProviderService.serialize(provider) for provider in providers]


@router.get("/providers/{provider_id}", response_model=ProviderPublicResponse)
def get_public_provider(provider_id: str, db: Session = Depends(get_db)):
    provider = ProviderService(db).get_public(provider_id)
    return ProviderService.serialize(provider)


@router.patch("/provider/me", response_model=ProviderPublicResponse)
def update_provider_me(
    payload: ProviderProfileUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.PROVIDER)),
    db: Session = Depends(get_db),
):
    provider = ProviderService(db).update_provider_profile(current_user, payload)
    return ProviderService.serialize(provider)


@router.patch("/provider/me/availability", response_model=ProviderPublicResponse)
def update_provider_availability(
    payload: AvailabilityUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.PROVIDER)),
    db: Session = Depends(get_db),
):
    provider = ProviderService(db).update_availability(
        current_user,
        payload.availability_status,
    )
    return ProviderService.serialize(provider)


@router.get("/admin/providers", response_model=list[ProviderPublicResponse])
def admin_list_providers(
    verification_status: VerificationStatus | None = Query(default=None),
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    providers = ProviderService(db).list_admin(verification_status=verification_status)
    return [ProviderService.serialize(provider) for provider in providers]


@router.patch("/admin/providers/{provider_id}/approve", response_model=ProviderPublicResponse)
def approve_provider(
    provider_id: str,
    _: ProviderVerificationActionRequest | None = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    provider = ProviderService(db).approve(provider_id)
    return ProviderService.serialize(provider)


@router.patch("/admin/providers/{provider_id}/reject", response_model=ProviderPublicResponse)
def reject_provider(
    provider_id: str,
    _: ProviderVerificationActionRequest | None = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    provider = ProviderService(db).reject(provider_id)
    return ProviderService.serialize(provider)


@router.patch("/admin/providers/{provider_id}/disable", response_model=ProviderPublicResponse)
def disable_provider(
    provider_id: str,
    _: ProviderVerificationActionRequest | None = None,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    provider = ProviderService(db).disable(provider_id)
    return ProviderService.serialize(provider)
