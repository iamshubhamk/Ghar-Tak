from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any
from app.core.enums import AvailabilityStatus, UserRole, VerificationStatus
from app.core.errors import AppErrorCode, app_http_error
from app.schemas.provider import ProviderProfileUpdateRequest
from app.services.notifications import NotificationService
from app.core.logger import setup_logger

logger = setup_logger("ghartak.providers")

class ProviderService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

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
        user = await self._get(provider_id)
        update_data = {
            "provider_profile.verification_status": VerificationStatus.VERIFIED.value,
            "provider_profile.is_public": True,
            "is_active": True
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

    async def reject(self, provider_id: str, rejection_reason: str | None = None) -> dict[str, Any]:
        user = await self._get(provider_id)
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
                f"Your GharTak provider profile was not approved yet. Reason: {rejection_reason or 'None provided'}."
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

    async def disable(self, provider_id: str) -> dict[str, Any]:
        user = await self._get(provider_id)
        update_data = {
            "provider_profile.verification_status": VerificationStatus.DISABLED.value,
            "provider_profile.is_public": False,
            "provider_profile.availability_status": AvailabilityStatus.UNAVAILABLE.value,
            "is_active": False
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
    def serialize(user: dict[str, Any]) -> dict:
        profile = user.get("provider_profile", {})
        return {
            "id": user["id"],
            "user_id": user["id"],
            "name": user["name"],
            "phone": user.get("phone"),
            "bio": profile.get("bio"),
            "experience_years": profile.get("experience_years", 0),
            "verification_status": profile.get("verification_status", VerificationStatus.PENDING_VERIFICATION.value),
            "rejection_reason": profile.get("rejection_reason"),
            "profile_photo_url": profile.get("profile_photo_url"),
            "adhaar_card_url": profile.get("adhaar_card_url"),
            "availability_status": profile.get("availability_status", AvailabilityStatus.UNAVAILABLE.value),
            "price_note": profile.get("price_note"),
            "average_rating": float(profile.get("average_rating", 0)),
            "total_reviews": profile.get("total_reviews", 0),
            "is_public": profile.get("is_public", False),
            "categories": profile.get("category_names", []),
            "localities": profile.get("locality_names", []),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at"),
        }
