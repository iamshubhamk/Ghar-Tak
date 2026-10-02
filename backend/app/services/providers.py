import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.enums import AvailabilityStatus, UserRole, VerificationStatus
from app.core.errors import AppErrorCode, app_http_error
from app.core.logger import setup_logger
from app.schemas.auth import clean_optional
from app.schemas.provider import ProviderProfileUpdateRequest
from app.services.notifications import NotificationService

logger = setup_logger("ghartak.providers")

class ProviderService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def submit_skill_request(
        self,
        provider_user: dict[str, Any],
        category_name: str,
        proof_url: str,
        notes: str | None = None,
    ) -> dict[str, Any]:
        provider = await self.get_provider_profile_for_user(provider_user)
        existing_categories = provider.get("provider_profile", {}).get("category_names", [])
        if any(cat.lower() == category_name.lower() for cat in existing_categories):
            raise app_http_error(
                400,
                AppErrorCode.VALIDATION_ERROR,
                f"You are already verified for {category_name}.",
            )

        existing_pending = await self.db.skill_requests.find_one({
            "provider_id": provider["id"],
            "category_name": {"$regex": f"^{category_name.strip()}$", "$options": "i"},
            "status": "PENDING",
        })
        if existing_pending:
            raise app_http_error(
                400,
                AppErrorCode.VALIDATION_ERROR,
                f"A pending skill request for {category_name} already exists.",
            )

        now = datetime.now(UTC)
        request_doc = {
            "id": str(uuid.uuid4()),
            "provider_id": provider["id"],
            "provider_name": provider["name"],
            "category_name": category_name,
            "proof_url": proof_url,
            "notes": notes,
            "status": "PENDING",
            "rejection_reason": None,
            "created_at": now,
            "updated_at": now,
        }
        await self.db.skill_requests.insert_one(request_doc)

        await NotificationService(self.db).notify_role(
            role=UserRole.ADMIN,
            title="New Skill Addition Request",
            message=f"{provider['name']} submitted a request to add skill '{category_name}'.",
            event_type="SKILL_REQUESTED",
            related_entity_type="skill_request",
            related_entity_id=request_doc["id"],
        )

        logger.info(f"Skill request {request_doc['id']} created by provider {provider['id']} for {category_name}")
        return request_doc

    async def list_provider_skill_requests(self, provider_id: str) -> list[dict[str, Any]]:
        cursor = self.db.skill_requests.find({"provider_id": provider_id}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def list_pending_skill_requests(self) -> list[dict[str, Any]]:
        cursor = self.db.skill_requests.find({"status": "PENDING"}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def approve_skill_request(self, request_id: str) -> dict[str, Any]:
        req = await self.db.skill_requests.find_one({"id": request_id})
        if not req:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Skill request not found.")

        if req["status"] != "PENDING":
            raise app_http_error(400, AppErrorCode.VALIDATION_ERROR, "Skill request is already processed.")

        now = datetime.now(UTC)
        await self.db.skill_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "APPROVED", "updated_at": now}}
        )

        provider = await self.db.users.find_one({"id": req["provider_id"]})
        if provider:
            current_categories = provider.get("provider_profile", {}).get("category_names", [])
            if req["category_name"] not in current_categories:
                updated_categories = current_categories + [req["category_name"]]
                await self.db.users.update_one(
                    {"id": req["provider_id"]},
                    {"$set": {"provider_profile.category_names": updated_categories}}
                )

            await NotificationService(self.db).notify_user(
                user_id=req["provider_id"],
                title="Skill Approved!",
                message=f"Your request to add skill '{req['category_name']}' has been approved by admin.",
                event_type="SKILL_APPROVED",
                related_entity_type="skill_request",
                related_entity_id=request_id,
            )

        logger.info(f"Skill request {request_id} approved for provider {req['provider_id']}")
        return await self.db.skill_requests.find_one({"id": request_id})

    async def reject_skill_request(self, request_id: str, rejection_reason: str | None = None) -> dict[str, Any]:
        req = await self.db.skill_requests.find_one({"id": request_id})
        if not req:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Skill request not found.")

        if req["status"] != "PENDING":
            raise app_http_error(400, AppErrorCode.VALIDATION_ERROR, "Skill request is already processed.")

        now = datetime.now(UTC)
        await self.db.skill_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "REJECTED", "rejection_reason": rejection_reason, "updated_at": now}}
        )

        await NotificationService(self.db).notify_user(
            user_id=req["provider_id"],
            title="Skill Request Reviewed",
            message=f"Your request for skill '{req['category_name']}' was not approved. Reason: {rejection_reason or 'None provided'}",
            event_type="SKILL_REJECTED",
            related_entity_type="skill_request",
            related_entity_id=request_id,
        )

        logger.info(f"Skill request {request_id} rejected for provider {req['provider_id']}")
        return await self.db.skill_requests.find_one({"id": request_id})

    async def get_provider_profile_for_user(self, user: dict[str, Any]) -> dict[str, Any]:
        if user.get("role") != UserRole.PROVIDER.value or not user.get("provider_profile"):
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Provider profile not found.")
        return user

    async def update_provider_profile(
        self,
        user: dict[str, Any],
        payload: ProviderProfileUpdateRequest,
    ) -> dict[str, Any]:
        user = await self.get_provider_profile_for_user(user)
        update_data = {}
        
        if payload.bio is not None:
            update_data["provider_profile.bio"] = payload.bio
        if payload.experience_years is not None:
            update_data["provider_profile.experience_years"] = payload.experience_years
        if payload.price_note is not None:
            update_data["provider_profile.price_note"] = payload.price_note
            
        if payload.category_ids is not None:
            if payload.category_ids:
                categories = await self.db.categories.find({"id": {"$in": payload.category_ids}, "is_active": True}).to_list(length=None)
                update_data["provider_profile.category_names"] = [c["name"] for c in categories]
            else:
                update_data["provider_profile.category_names"] = []
                
        if payload.localities is not None:
            update_data["provider_profile.locality_names"] = payload.localities

        if update_data:
            await self.db.users.update_one({"id": user["id"]}, {"$set": update_data})

        return await self._get(user["id"])

    async def update_availability(
        self,
        user: dict[str, Any],
        availability_status: AvailabilityStatus,
    ) -> dict[str, Any]:
        user = await self.get_provider_profile_for_user(user)
        await self.db.users.update_one(
            {"id": user["id"]},
            {"$set": {"provider_profile.availability_status": availability_status.value}}
        )
        logger.info(f"Provider {user['id']} updated availability to {availability_status.value}")
        return await self._get(user["id"])

    async def list_admin(
        self,
        verification_status: VerificationStatus | None = None,
    ) -> list[dict[str, Any]]:
        query = {"role": UserRole.PROVIDER.value}
        if verification_status:
            query["provider_profile.verification_status"] = verification_status.value
            
        cursor = self.db.users.find(query).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def list_public(
        self,
        category_id: str | None = None,
        locality: str | None = None,
    ) -> list[dict[str, Any]]:
        query = {
            "role": UserRole.PROVIDER.value,
            "provider_profile.verification_status": VerificationStatus.VERIFIED.value,
            "provider_profile.is_public": True,
            "is_active": True
        }
        
        if category_id:
            category = await self.db.categories.find_one({"id": category_id})
            if category:
                query["provider_profile.category_names"] = category["name"]
            else:
                return []
                
        if locality:
            query["provider_profile.locality_names"] = {"$regex": f"^{locality.strip()}$", "$options": "i"}

        cursor = self.db.users.find(query).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def get_public(self, provider_id: str) -> dict[str, Any]:
        user = await self._get(provider_id)
        profile = user.get("provider_profile", {})
        if (
            profile.get("verification_status") != VerificationStatus.VERIFIED.value
            or not profile.get("is_public")
            or not user.get("is_active")
        ):
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Provider not found.")
        return user

    async def approve(self, provider_id: str) -> dict[str, Any]:
        await self._get(provider_id)
        update_data = {
            "provider_profile.verification_status": VerificationStatus.VERIFIED.value,
            "provider_profile.is_public": True,
            "is_active": True,
        }
        await self.db.users.update_one({"id": provider_id}, {"$set": update_data})

        await NotificationService(self.db).notify_user(
            user_id=provider_id,
            title="Profile approved",
            message=(
                "Your GharTak provider profile is approved. "
                "Booking requests can now be assigned to you."
            ),
            event_type="PROVIDER_APPROVED",
            related_entity_type="provider",
            related_entity_id=provider_id,
        )
        logger.info(f"Provider {provider_id} approved by admin.")
        return await self._get(provider_id)

    async def reject(
        self, provider_id: str, rejection_reason: str | None = None
    ) -> dict[str, Any]:
        await self._get(provider_id)
        update_data = {
            "provider_profile.verification_status": VerificationStatus.REJECTED.value,
            "provider_profile.is_public": False,
            "provider_profile.rejection_reason": rejection_reason,
        }
        await self.db.users.update_one({"id": provider_id}, {"$set": update_data})

        await NotificationService(self.db).notify_user(
            user_id=provider_id,
            title="Profile needs review",
            message=(
                "Your GharTak provider profile was not approved yet. "
                f"Reason: {rejection_reason or 'None provided'}."
            ),
            event_type="PROVIDER_REJECTED",
            related_entity_type="provider",
            related_entity_id=provider_id,
        )
        logger.info(f"Provider {provider_id} rejected by admin. Reason: {rejection_reason}")
        return await self._get(provider_id)

    async def reraise_verification(self, user: dict[str, Any]) -> dict[str, Any]:
        user = await self.get_provider_profile_for_user(user)
        update_data = {
            "provider_profile.verification_status": VerificationStatus.PENDING_VERIFICATION.value,
            "provider_profile.rejection_reason": None,
        }
        await self.db.users.update_one({"id": user["id"]}, {"$set": update_data})
        return await self._get(user["id"])

    async def resubmit_application(self, user: dict[str, Any], form: Any) -> dict[str, Any]:
        user = await self.get_provider_profile_for_user(user)
        user_id = user["id"]
        settings = get_settings()

        update_data: dict[str, Any] = {
            "provider_profile.verification_status": VerificationStatus.PENDING_VERIFICATION.value,
            "provider_profile.rejection_reason": None,
            "provider_profile.is_public": False,
            "updated_at": datetime.now(UTC),
        }

        # Handle Aadhaar card file if uploaded
        adhaar_card = form.get("adhaar_card")
        if adhaar_card and getattr(adhaar_card, "filename", None):
            allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
            if getattr(adhaar_card, "content_type", "") not in allowed:
                raise app_http_error(
                    400,
                    AppErrorCode.VALIDATION_ERROR,
                    "Aadhaar card must be a PDF or image (JPG/PNG).",
                )
            private_dir = Path(settings.local_upload_dir) / "private"
            os.makedirs(private_dir, exist_ok=True)
            adhaar_filename_orig = getattr(adhaar_card, "filename", "") or ""
            ext = os.path.splitext(adhaar_filename_orig)[1].lower() or ".jpg"
            saved_name = f"adhaar_{user_id}_{uuid.uuid4().hex[:8]}{ext}"
            saved_path = private_dir / saved_name
            content = await adhaar_card.read()
            with open(saved_path, "wb") as f:
                f.write(content)
            update_data["provider_profile.adhaar_card_url"] = f"/api/v1/providers/{user_id}/adhaar"
            update_data["provider_profile.adhaar_card_filename"] = saved_name

        # Parse bank details
        bank_holder = clean_optional(form.get("bank_account_holder"))
        bank_acc = clean_optional(form.get("bank_account_number"))
        bank_ifsc = clean_optional(form.get("bank_ifsc"))
        if bank_ifsc:
            bank_ifsc = bank_ifsc.upper()
        payout_upi = clean_optional(form.get("payout_upi_id"))

        if bank_holder is not None:
            update_data["provider_profile.bank_account_holder"] = bank_holder
        if bank_acc is not None:
            update_data["provider_profile.bank_account_number"] = bank_acc
        if bank_ifsc is not None:
            update_data["provider_profile.bank_ifsc"] = bank_ifsc
        if payout_upi is not None:
            update_data["provider_profile.payout_upi_id"] = payout_upi

        # Parse categories
        raw_cats = form.getlist("categories") if hasattr(form, "getlist") else form.get("categories")
        if raw_cats:
            cat_list = []
            if isinstance(raw_cats, list):
                for item in raw_cats:
                    if isinstance(item, str) and item.startswith("["):
                        try:
                            parsed = json.loads(item)
                            if isinstance(parsed, list):
                                cat_list.extend([str(x) for x in parsed])
                        except Exception:
                            cat_list.append(str(item))
                    elif item:
                        cat_list.append(str(item))
            elif isinstance(raw_cats, str):
                try:
                    parsed = json.loads(raw_cats)
                    if isinstance(parsed, list):
                        cat_list = [str(x) for x in parsed]
                    else:
                        cat_list = [raw_cats]
                except Exception:
                    cat_list = [x.strip() for x in raw_cats.split(",") if x.strip()]
            if cat_list:
                update_data["provider_profile.category_names"] = cat_list

        # Parse localities
        raw_locs = form.getlist("localities") if hasattr(form, "getlist") else form.get("localities")
        if raw_locs:
            loc_list = []
            if isinstance(raw_locs, list):
                for item in raw_locs:
                    if isinstance(item, str) and item.startswith("["):
                        try:
                            parsed = json.loads(item)
                            if isinstance(parsed, list):
                                loc_list.extend([str(x) for x in parsed])
                        except Exception:
                            loc_list.append(str(item))
                    elif item:
                        loc_list.append(str(item))
            elif isinstance(raw_locs, str):
                try:
                    parsed = json.loads(raw_locs)
                    if isinstance(parsed, list):
                        loc_list = [str(x) for x in parsed]
                    else:
                        loc_list = [raw_locs]
                except Exception:
                    loc_list = [x.strip() for x in raw_locs.split(",") if x.strip()]
            if loc_list:
                update_data["provider_profile.locality_names"] = loc_list

        # Parse experience_years
        exp_raw = form.get("experience_years")
        if exp_raw is not None and str(exp_raw).strip() != "":
            try:
                update_data["provider_profile.experience_years"] = int(exp_raw)
            except ValueError:
                pass

        # Parse has_tools
        tools_raw = form.get("has_tools")
        if tools_raw is not None:
            update_data["provider_profile.has_tools"] = str(tools_raw).lower() in ("true", "1", "yes")

        # Parse bio
        bio_raw = clean_optional(form.get("bio"))
        if bio_raw is not None:
            update_data["provider_profile.bio"] = bio_raw

        await self.db.users.update_one({"id": user_id}, {"$set": update_data})

        # Notify admins
        await NotificationService(self.db).notify_role(
            role=UserRole.ADMIN,
            title="Partner Application Resubmitted",
            message=f"Provider {user.get('name', 'Partner')} has updated their details and re-submitted their application for verification.",
            event_type="PROVIDER_APPLICATION_RESUBMITTED",
            related_entity_type="provider",
            related_entity_id=user_id,
        )

        # Notify provider
        await NotificationService(self.db).notify_user(
            user_id=user_id,
            title="Application Re-submitted",
            message="Your updated application and documents were received and are under admin review.",
            event_type="PROVIDER_APPLICATION_SUBMITTED",
            related_entity_type="provider",
            related_entity_id=user_id,
        )

        logger.info(f"Provider {user_id} resubmitted application for verification.")
        return await self._get(user_id)

    async def disable(self, provider_id: str) -> dict[str, Any]:
        await self._get(provider_id)
        update_data = {
            "provider_profile.verification_status": VerificationStatus.DISABLED.value,
            "provider_profile.is_public": False,
            "provider_profile.availability_status": AvailabilityStatus.UNAVAILABLE.value,
            "is_active": False,
        }
        await self.db.users.update_one({"id": provider_id}, {"$set": update_data})

        await NotificationService(self.db).notify_user(
            user_id=provider_id,
            title="Profile disabled",
            message="Your GharTak provider profile has been disabled by admin.",
            event_type="PROVIDER_DISABLED",
            related_entity_type="provider",
            related_entity_id=provider_id,
        )
        logger.info(f"Provider {provider_id} disabled by admin.")
        return await self._get(provider_id)

    async def _get(self, provider_id: str) -> dict[str, Any]:
        user = await self.db.users.find_one({"id": provider_id, "role": UserRole.PROVIDER.value})
        if not user or not user.get("provider_profile"):
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Provider not found.")
        return user

    @staticmethod
    def serialize(user: dict[str, Any], is_admin: bool = False, is_owner: bool = False) -> dict:
        profile = user.get("provider_profile", {})
        can_view_sensitive = is_admin or is_owner
        ver_status = profile.get(
            "verification_status", VerificationStatus.PENDING_VERIFICATION.value
        )
        avail_status = profile.get(
            "availability_status", AvailabilityStatus.UNAVAILABLE.value
        )
        return {
            "id": user["id"],
            "user_id": user["id"],
            "name": user["name"],
            "phone": user.get("phone"),
            "bio": profile.get("bio"),
            "experience_years": profile.get("experience_years", 0),
            "verification_status": ver_status,
            "rejection_reason": profile.get("rejection_reason"),
            "profile_photo_url": profile.get("profile_photo_url"),
            "adhaar_card_url": profile.get("adhaar_card_url") if can_view_sensitive else None,
            "availability_status": avail_status,
            "price_note": profile.get("price_note"),
            "average_rating": float(profile.get("average_rating", 0)),
            "total_reviews": profile.get("total_reviews", 0),
            "is_public": profile.get("is_public", False),
            "categories": profile.get("category_names", []),
            "localities": profile.get("locality_names", []),
            "has_tools": profile.get("has_tools", False),
            "bank_account_holder": (
                profile.get("bank_account_holder") if can_view_sensitive else None
            ),
            "bank_account_number": (
                profile.get("bank_account_number") if can_view_sensitive else None
            ),
            "bank_ifsc": (
                profile.get("bank_ifsc") if can_view_sensitive else None
            ),
            "payout_upi_id": (
                profile.get("payout_upi_id") if can_view_sensitive else None
            ),
            "bank_proof_url": (
                profile.get("bank_proof_url") if can_view_sensitive else None
            ),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at"),
        }
