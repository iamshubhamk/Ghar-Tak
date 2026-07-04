import os
import uuid
from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import require_roles
from app.core.config import get_settings
from app.core.enums import UserRole, VerificationStatus
from app.db.session import get_db
from app.schemas.provider import (
    AvailabilityUpdateRequest,
    ProviderProfileUpdateRequest,
    ProviderPublicResponse,
    ProviderVerificationActionRequest,
)
from app.services.providers import ProviderService

router = APIRouter(tags=["providers"])


@router.get("/provider/me", response_model=ProviderPublicResponse)
async def get_provider_me(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).get_provider_profile_for_user(current_user)
    return ProviderService.serialize(provider)


@router.post("/provider/me/documents", response_model=ProviderPublicResponse)
async def upload_provider_documents(
    profile_photo: UploadFile = File(None),
    adhaar_card: UploadFile = File(None),
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    settings = get_settings()
    update_data = {}

    if profile_photo:
        if not profile_photo.content_type.startswith("image/"):
            raise HTTPException(400, "Profile photo must be an image (JPG/JPEG).")
        ext = os.path.splitext(profile_photo.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.local_upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(await profile_photo.read())
        update_data["provider_profile.profile_photo_url"] = f"/uploads/{filename}"

    if adhaar_card:
        if adhaar_card.content_type != "application/pdf":
            raise HTTPException(400, "Adhaar card must be a PDF.")
        ext = os.path.splitext(adhaar_card.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.local_upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(await adhaar_card.read())
        update_data["provider_profile.adhaar_card_url"] = f"/uploads/{filename}"

    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})

    provider = await ProviderService(db).get_provider_profile_for_user(current_user)
    return ProviderService.serialize(provider)


@router.post("/provider/me/reraise", response_model=ProviderPublicResponse)
async def reraise_verification(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).reraise_verification(current_user)
    return ProviderService.serialize(provider)


@router.get("/providers", response_model=list[ProviderPublicResponse])
async def list_public_providers(
    category_id: str | None = Query(default=None),
    locality: str | None = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    providers = await ProviderService(db).list_public(category_id=category_id, locality=locality)
    return [ProviderService.serialize(provider) for provider in providers]


@router.get("/providers/{provider_id}", response_model=ProviderPublicResponse)
async def get_public_provider(provider_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    provider = await ProviderService(db).get_public(provider_id)
    return ProviderService.serialize(provider)


@router.patch("/provider/me", response_model=ProviderPublicResponse)
async def update_provider_me(
    payload: ProviderProfileUpdateRequest,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).update_provider_profile(current_user, payload)
    return ProviderService.serialize(provider)


@router.patch("/provider/me/availability", response_model=ProviderPublicResponse)
async def update_provider_availability(
    payload: AvailabilityUpdateRequest,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).update_availability(
        current_user,
        payload.availability_status,
    )
    return ProviderService.serialize(provider)


@router.get("/admin/providers", response_model=list[ProviderPublicResponse])
async def admin_list_providers(
    verification_status: VerificationStatus | None = Query(default=None),
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    providers = await ProviderService(db).list_admin(verification_status=verification_status)
    return [ProviderService.serialize(provider) for provider in providers]


@router.patch("/admin/providers/{provider_id}/approve", response_model=ProviderPublicResponse)
async def approve_provider(
    provider_id: str,
    _: ProviderVerificationActionRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).approve(provider_id)
    return ProviderService.serialize(provider)


@router.patch("/admin/providers/{provider_id}/reject", response_model=ProviderPublicResponse)
async def reject_provider(
    provider_id: str,
    payload: ProviderVerificationActionRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    reason = payload.rejection_reason if payload else None
    provider = await ProviderService(db).reject(provider_id, rejection_reason=reason)
    return ProviderService.serialize(provider)


@router.patch("/admin/providers/{provider_id}/disable", response_model=ProviderPublicResponse)
async def disable_provider(
    provider_id: str,
    _: ProviderVerificationActionRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).disable(provider_id)
    return ProviderService.serialize(provider)
