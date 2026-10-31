import os
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import require_roles
from app.core.enums import UserRole, VerificationStatus
from app.core.logger import setup_logger
from app.db.session import get_db
from app.schemas.provider import (
    AvailabilityUpdateRequest,
    ProviderProfileUpdateRequest,
    ProviderPublicResponse,
    ProviderVerificationActionRequest,
    SkillRequestResponse,
)
from app.services.providers import ProviderService
from app.services.uploads import has_file, private_file_response, store_upload

logger = setup_logger("ghartak.api.providers")

router = APIRouter(tags=["providers"])


@router.get("/provider/me", response_model=ProviderPublicResponse)
async def get_provider_me(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).get_provider_profile_for_user(current_user)
    return ProviderService.serialize(provider, is_owner=True)


@router.post("/provider/me/documents", response_model=ProviderPublicResponse)
async def upload_provider_documents(
    profile_photo: UploadFile = File(None),
    adhaar_card: UploadFile = File(None),
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    update_data = {}

    if has_file(profile_photo):
        stored = await store_upload(profile_photo, "photo", "public")
        update_data["provider_profile.profile_photo_url"] = f"/uploads/{stored.filename}"

    if has_file(adhaar_card):
        stored = await store_upload(adhaar_card, "document", "private")
        update_data["provider_profile.adhaar_card_url"] = (
            f"/api/v1/providers/{current_user['id']}/adhaar"
        )
        update_data["provider_profile.adhaar_card_filename"] = stored.filename

    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
        logger.info(f"Provider {current_user['id']} uploaded new documents.")
        # SU-015: `current_user` was read before the update; answer with the stored user.
        current_user = await db.users.find_one({"id": current_user["id"]}) or current_user

    provider = await ProviderService(db).get_provider_profile_for_user(current_user)
    return ProviderService.serialize(provider, is_owner=True)


@router.post("/provider/me/resubmit", response_model=ProviderPublicResponse)
async def resubmit_provider_application(
    request: Request,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    form = await request.form()
    provider = await ProviderService(db).resubmit_application(current_user, form)
    return ProviderService.serialize(provider, is_owner=True)


@router.get("/providers/{provider_id}/adhaar")
async def get_provider_adhaar(
    provider_id: str,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN, UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    is_admin = current_user.get("role") == UserRole.ADMIN.value
    is_owner = (
        current_user.get("role") == UserRole.PROVIDER.value
        and current_user.get("id") == provider_id
    )
    if not is_admin and not is_owner:
        raise HTTPException(403, "Access to this identity document is forbidden.")

    provider = await db.users.find_one({"id": provider_id, "role": UserRole.PROVIDER.value})
    if not provider:
        raise HTTPException(404, "Provider not found.")

    profile = provider.get("provider_profile", {})
    filename = profile.get("adhaar_card_filename")
    if not filename:
        url = profile.get("adhaar_card_url", "")
        if url:
            filename = os.path.basename(url)

    if not filename:
        raise HTTPException(404, "Aadhaar document not found.")

    return private_file_response(
        filename,
        f"Aadhaar_{provider.get('name', 'Provider').replace(' ', '_')}",
        "Aadhaar document file not found.",
    )


@router.get("/providers/{provider_id}/bank-proof")
async def get_provider_bank_proof(
    provider_id: str,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN, UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    is_admin = current_user.get("role") == UserRole.ADMIN.value
    is_owner = (
        current_user.get("role") == UserRole.PROVIDER.value
        and current_user.get("id") == provider_id
    )
    if not is_admin and not is_owner:
        raise HTTPException(403, "Access to this financial document is forbidden.")

    provider = await db.users.find_one({"id": provider_id, "role": UserRole.PROVIDER.value})
    if not provider:
        raise HTTPException(404, "Provider not found.")

    profile = provider.get("provider_profile", {})
    filename = profile.get("bank_proof_filename")
    if not filename:
        url = profile.get("bank_proof_url", "")
        if url:
            filename = os.path.basename(url)

    if not filename:
        raise HTTPException(404, "Bank proof document not found.")

    return private_file_response(
        filename,
        f"BankProof_{provider.get('name', 'Provider').replace(' ', '_')}",
        "Bank proof document file not found.",
    )


@router.post("/provider/me/skill-requests", response_model=SkillRequestResponse)
async def create_skill_request(
    category_name: str = Form(...),
    notes: str | None = Form(default=None),
    proof_file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    stored = await store_upload(proof_file, "document", "private", prefix="skill_proof_")
    return await ProviderService(db).submit_skill_request(
        provider_user=current_user,
        category_name=category_name,
        proof_filename=stored.filename,
        notes=notes,
    )


@router.get(
    "/skill-requests/{request_id}/proof",
    responses={
        200: {"description": "The proof file. Admin or the owning provider only."},
        401: {"description": "Login required."},
        403: {"description": "Not the owner and not an admin."},
        404: {"description": "Request or file not found."},
    },
)
async def get_skill_request_proof(
    request_id: str,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN, UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    skill_request = await db.skill_requests.find_one({"id": request_id})
    if not skill_request:
        raise HTTPException(404, "Skill request not found.")

    is_admin = current_user.get("role") == UserRole.ADMIN.value
    is_owner = skill_request.get("provider_id") == current_user.get("id")
    if not is_admin and not is_owner:
        raise HTTPException(403, "Access to this document is forbidden.")

    filename = skill_request.get("proof_filename") or os.path.basename(
        skill_request.get("proof_url", "")
    )
    if not filename:
        raise HTTPException(404, "Skill proof not found.")
    return private_file_response(
        filename,
        f"SkillProof_{skill_request.get('category_name', 'Skill').replace(' ', '_')}",
        "Skill proof file not found.",
    )


@router.get("/provider/me/skill-requests", response_model=list[SkillRequestResponse])
async def list_my_skill_requests(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).get_provider_profile_for_user(current_user)
    return await ProviderService(db).list_provider_skill_requests(provider["id"])


@router.get("/admin/skill-requests", response_model=list[SkillRequestResponse])
async def admin_list_skill_requests(
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await ProviderService(db).list_pending_skill_requests()


@router.patch("/admin/skill-requests/{request_id}/approve", response_model=SkillRequestResponse)
async def admin_approve_skill_request(
    request_id: str,
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await ProviderService(db).approve_skill_request(request_id)


@router.patch("/admin/skill-requests/{request_id}/reject", response_model=SkillRequestResponse)
async def admin_reject_skill_request(
    request_id: str,
    payload: ProviderVerificationActionRequest | None = None,
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    reason = payload.rejection_reason if payload else None
    return await ProviderService(db).reject_skill_request(request_id, rejection_reason=reason)


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
    return ProviderService.serialize(provider, is_owner=True)


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
    return ProviderService.serialize(provider, is_owner=True)


@router.get("/admin/providers", response_model=list[ProviderPublicResponse])
async def admin_list_providers(
    verification_status: VerificationStatus | None = Query(default=None),
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    providers = await ProviderService(db).list_admin(verification_status=verification_status)
    return [ProviderService.serialize(provider, is_admin=True) for provider in providers]


@router.patch("/admin/providers/{provider_id}/approve", response_model=ProviderPublicResponse)
async def approve_provider(
    provider_id: str,
    _: ProviderVerificationActionRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).approve(provider_id)
    return ProviderService.serialize(provider, is_admin=True)


@router.patch("/admin/providers/{provider_id}/reject", response_model=ProviderPublicResponse)
async def reject_provider(
    provider_id: str,
    payload: ProviderVerificationActionRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    reason = payload.rejection_reason if payload else None
    provider = await ProviderService(db).reject(provider_id, rejection_reason=reason)
    return ProviderService.serialize(provider, is_admin=True)


@router.patch("/admin/providers/{provider_id}/disable", response_model=ProviderPublicResponse)
async def disable_provider(
    provider_id: str,
    _: ProviderVerificationActionRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    provider = await ProviderService(db).disable(provider_id)
    return ProviderService.serialize(provider, is_admin=True)
