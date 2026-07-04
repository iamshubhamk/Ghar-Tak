import uuid
from datetime import UTC, datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.enums import UserRole, VerificationStatus, AvailabilityStatus
from app.core.errors import AppErrorCode, app_http_error
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.auth import (
    CustomerRegisterRequest,
    LoginRequest,
    ProviderRegisterRequest,
    TokenResponse,
)
from app.services.notifications import NotificationService

class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def register_customer(self, payload: CustomerRegisterRequest) -> TokenResponse:
        await self._ensure_unique_contact(email=payload.email, phone=payload.phone)

        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "name": payload.name,
            "email": payload.email.lower() if payload.email else None,
            "phone": payload.phone,
            "password_hash": hash_password(payload.password),
            "role": UserRole.CUSTOMER.value,
            "is_active": True,
            "customer_profile": {
                "default_address": payload.default_address,
                "default_locality": payload.default_locality,
            },
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        await self.db.users.insert_one(user_doc)
        return self._token_for_user(user_doc)

    async def register_provider(self, payload: ProviderRegisterRequest) -> TokenResponse:
        await self._ensure_unique_contact(email=payload.email, phone=payload.phone)

        user_id = str(uuid.uuid4())
        
        # Verify categories
        if payload.category_ids:
            categories = await self.db.categories.find({"id": {"$in": payload.category_ids}, "is_active": True}).to_list(None)
            category_names = [c["name"] for c in categories]
        else:
            category_names = []
            
        user_doc = {
            "id": user_id,
            "name": payload.name,
            "email": payload.email.lower() if payload.email else None,
            "phone": payload.phone,
            "password_hash": hash_password(payload.password),
            "role": UserRole.PROVIDER.value,
            "is_active": True,
            "provider_profile": {
                "bio": payload.bio,
                "experience_years": payload.experience_years,
                "price_note": payload.price_note,
                "verification_status": VerificationStatus.PENDING_VERIFICATION.value,
                "availability_status": AvailabilityStatus.UNAVAILABLE.value,
                "average_rating": 0,
                "total_reviews": 0,
                "is_public": False,
                "category_names": category_names,
                "locality_names": payload.localities
            },
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        await self.db.users.insert_one(user_doc)
        
        await NotificationService(self.db).notify_role(
            role=UserRole.ADMIN,
            title="Provider application received",
            message=f"{user_doc['name']} applied to join GharTak as a provider.",
            event_type="PROVIDER_APPLICATION_SUBMITTED",
            related_entity_type="provider",
            related_entity_id=user_id,
        )
        
        return self._token_for_user(user_doc)

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self._find_by_contact(email=payload.email, phone=payload.phone)
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise app_http_error(
                401,
                AppErrorCode.INVALID_CREDENTIALS,
                "Invalid email/phone or password.",
            )
        if not user.get("is_active"):
            raise app_http_error(403, AppErrorCode.ACCOUNT_DISABLED, "Account is disabled.")

        return self._token_for_user(user)

    async def create_admin_user(
        self,
        *,
        name: str,
        email: str,
        password: str,
        phone: str | None = None,
    ) -> dict:
        await self._ensure_unique_contact(email=email, phone=phone)
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "name": name,
            "email": email.lower(),
            "phone": phone,
            "password_hash": hash_password(password),
            "role": UserRole.ADMIN.value,
            "is_active": True,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC)
        }
        await self.db.users.insert_one(user_doc)
        return user_doc

    def _token_for_user(self, user: dict) -> TokenResponse:
        token = create_access_token(subject=user["id"], role=user["role"])
        return TokenResponse(access_token=token, user=user) # type: ignore

    async def _ensure_unique_contact(self, *, email: str | None, phone: str | None) -> None:
        existing_user = await self._find_by_contact(email=email, phone=phone)
        if existing_user:
            raise app_http_error(
                409,
                AppErrorCode.DUPLICATE_ACCOUNT,
                "An account already exists with this email or phone.",
            )

    async def _find_by_contact(self, *, email: str | None, phone: str | None) -> dict | None:
        filters = []
        if email:
            filters.append({"email": email.lower()})
        if phone:
            filters.append({"phone": phone})
        if not filters:
            return None
            
        return await self.db.users.find_one({"$or": filters})

def role_label(role: str) -> str:
    try:
        return UserRole(role).value
    except ValueError:
        return role

