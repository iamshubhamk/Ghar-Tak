import json
import uuid
from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.enums import AvailabilityStatus, UserRole, VerificationStatus
from app.core.errors import AppErrorCode, app_http_error
from app.core.logger import setup_logger
from app.core.security import create_access_token, hash_password, verify_password
from app.schemas.auth import (
    CustomerRegisterRequest,
    LoginRequest,
    PasswordResetSubmitRequest,
    PasswordResetVerifyRequest,
    PasswordResetVerifyResponse,
    ProviderRegisterRequest,
    TokenResponse,
    clean_optional,
)
from app.services.notifications import NotificationService
from app.services.sessions import SessionService
from app.services.uploads import has_file, store_upload, validate_upload

logger = setup_logger("ghartak.auth")


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
            "updated_at": datetime.now(UTC),
        }
        await self.db.users.insert_one(user_doc)
        contact_id = payload.email or payload.phone
        logger.info(f"Customer registered successfully: {user_id} ({contact_id})")
        return self._token_for_user(user_doc)

    async def register_provider(self, payload: ProviderRegisterRequest) -> TokenResponse:
        await self._ensure_unique_contact(email=payload.email, phone=payload.phone)

        user_id = str(uuid.uuid4())

        # Verify categories
        if payload.category_ids:
            categories = await self.db.categories.find(
                {"id": {"$in": payload.category_ids}, "is_active": True}
            ).to_list(None)
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
                "locality_names": payload.localities,
                "has_tools": payload.has_tools,
                "bank_account_holder": payload.bank_account_holder,
                "bank_account_number": payload.bank_account_number,
                "bank_ifsc": payload.bank_ifsc,
                "payout_upi_id": payload.payout_upi_id,
                "bank_proof_url": None,
                "bank_proof_filename": None,
                "adhaar_card_url": None,
                "adhaar_card_filename": None,
                "profile_photo_url": None,
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

        contact_info = payload.email or payload.phone
        logger.info(f"Provider registered successfully: {user_id} ({contact_info})")
        return self._token_for_user(user_doc)

    async def register_provider_form(self, form: Any) -> TokenResponse:

        name = clean_optional(form.get("name"))
        email = clean_optional(form.get("email"))
        phone = clean_optional(form.get("phone"))
        password = form.get("password") or ""
        bio = clean_optional(form.get("bio"))
        price_note = clean_optional(form.get("price_note"))

        # Parse experience_years
        try:
            exp_val = form.get("experience_years", 0)
            experience_years = int(exp_val) if exp_val else 0
        except (ValueError, TypeError):
            experience_years = 0

        # Parse has_tools
        has_tools_raw = form.get("has_tools", False)
        has_tools = str(has_tools_raw).lower() in ("true", "1", "yes", "on")

        # Parse category_ids
        category_ids: list[str] = []
        raw_cats = form.getlist("category_ids") if hasattr(form, "getlist") else []
        if not raw_cats and "category_ids" in form:
            val = form.get("category_ids")
            if isinstance(val, str) and (val.startswith("[") or "," in val):
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        category_ids = [str(x) for x in parsed]
                except Exception:
                    category_ids = [x.strip() for x in val.split(",") if x.strip()]
            elif val:
                category_ids = [str(val)]
        else:
            for item in raw_cats:
                if isinstance(item, str) and item.startswith("["):
                    try:
                        parsed = json.loads(item)
                        if isinstance(parsed, list):
                            category_ids.extend([str(x) for x in parsed])
                    except Exception:
                        category_ids.append(item)
                elif item:
                    category_ids.append(str(item))

        # Parse localities
        localities: list[str] = []
        raw_locs = form.getlist("localities") if hasattr(form, "getlist") else []
        if not raw_locs and "localities" in form:
            val = form.get("localities")
            if isinstance(val, str) and (val.startswith("[") or "," in val):
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, list):
                        localities = [str(x) for x in parsed]
                except Exception:
                    localities = [x.strip() for x in val.split(",") if x.strip()]
            elif val:
                localities = [str(val)]
        else:
            for item in raw_locs:
                if isinstance(item, str) and item.startswith("["):
                    try:
                        parsed = json.loads(item)
                        if isinstance(parsed, list):
                            localities.extend([str(x) for x in parsed])
                    except Exception:
                        localities.append(item)
                elif item:
                    localities.append(str(item))

        bank_account_holder = clean_optional(form.get("bank_account_holder"))
        bank_account_number = clean_optional(form.get("bank_account_number"))
        bank_ifsc = clean_optional(form.get("bank_ifsc"))
        if bank_ifsc:
            bank_ifsc = bank_ifsc.upper()
        payout_upi_id = clean_optional(form.get("payout_upi_id"))

        # Aadhaar card is mandatory for form-based partner registration
        adhaar_card = form.get("adhaar_card")
        if not adhaar_card or not getattr(adhaar_card, "filename", None):
            raise app_http_error(
                400,
                AppErrorCode.VALIDATION_ERROR,
                "Aadhaar card document upload is mandatory for provider registration.",
            )

        # Validate core fields through ProviderRegisterRequest Pydantic model
        try:
            req_model = ProviderRegisterRequest(
                name=name or "",
                email=email,
                phone=phone,
                password=password,
                bio=bio,
                experience_years=experience_years,
                price_note=price_note,
                category_ids=category_ids,
                localities=localities,
                has_tools=has_tools,
                bank_account_holder=bank_account_holder,
                bank_account_number=bank_account_number,
                bank_ifsc=bank_ifsc,
                payout_upi_id=payout_upi_id,
            )
        except Exception as e:
            raise app_http_error(422, AppErrorCode.VALIDATION_ERROR, str(e)) from e

        await self._ensure_unique_contact(email=req_model.email, phone=req_model.phone)

        user_id = str(uuid.uuid4())

        # Validate every file before writing any of them, so a bad one leaves nothing behind.
        bank_proof = form.get("bank_proof")
        profile_photo = form.get("profile_photo")
        await validate_upload(adhaar_card, "document")
        await adhaar_card.seek(0)
        if has_file(bank_proof):
            await validate_upload(bank_proof, "document")
            await bank_proof.seek(0)
        if has_file(profile_photo):
            await validate_upload(profile_photo, "photo")
            await profile_photo.seek(0)

        # 1. Aadhaar card (private)
        stored = await store_upload(adhaar_card, "document", "private", prefix="adhaar_")
        adhaar_card_url = f"/api/v1/providers/{user_id}/adhaar"
        adhaar_card_filename = stored.filename

        # 2. Bank proof (private, optional)
        bank_proof_url = None
        bank_proof_filename = None
        if has_file(bank_proof):
            stored = await store_upload(bank_proof, "document", "private", prefix="bank_proof_")
            bank_proof_url = f"/api/v1/providers/{user_id}/bank-proof"
            bank_proof_filename = stored.filename

        # 3. Profile photo (public, optional)
        profile_photo_url = None
        if has_file(profile_photo):
            stored = await store_upload(profile_photo, "photo", "public")
            profile_photo_url = f"/uploads/{stored.filename}"

        # Resolve category names
        if req_model.category_ids:
            categories = await self.db.categories.find(
                {"id": {"$in": req_model.category_ids}, "is_active": True}
            ).to_list(None)
            category_names = [c["name"] for c in categories]
        else:
            category_names = []

        user_doc = {
            "id": user_id,
            "name": req_model.name,
            "email": req_model.email.lower() if req_model.email else None,
            "phone": req_model.phone,
            "password_hash": hash_password(req_model.password),
            "role": UserRole.PROVIDER.value,
            "is_active": True,
            "provider_profile": {
                "bio": req_model.bio,
                "experience_years": req_model.experience_years,
                "price_note": req_model.price_note,
                "verification_status": VerificationStatus.PENDING_VERIFICATION.value,
                "availability_status": AvailabilityStatus.UNAVAILABLE.value,
                "average_rating": 0,
                "total_reviews": 0,
                "is_public": False,
                "category_names": category_names,
                "locality_names": req_model.localities,
                "has_tools": req_model.has_tools,
                "bank_account_holder": req_model.bank_account_holder,
                "bank_account_number": req_model.bank_account_number,
                "bank_ifsc": req_model.bank_ifsc,
                "payout_upi_id": req_model.payout_upi_id,
                "bank_proof_url": bank_proof_url,
                "bank_proof_filename": bank_proof_filename,
                "adhaar_card_url": adhaar_card_url,
                "adhaar_card_filename": adhaar_card_filename,
                "profile_photo_url": profile_photo_url,
            },
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
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

        contact_form_id = req_model.email or req_model.phone
        logger.info(f"Provider registered successfully via form: {user_id} ({contact_form_id})")
        return self._token_for_user(user_doc)

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self._find_by_contact(email=payload.email, phone=payload.phone)
        contact = payload.email or payload.phone
        if not user or not verify_password(payload.password, user["password_hash"]):
            logger.warning(f"Failed login attempt for {contact}: Invalid credentials")
            raise app_http_error(
                401,
                AppErrorCode.INVALID_CREDENTIALS,
                "Invalid email/phone or password.",
            )
        if not user.get("is_active"):
            logger.warning(f"Failed login attempt for {contact}: Account disabled")
            raise app_http_error(403, AppErrorCode.ACCOUNT_DISABLED, "Account is disabled.")

        logger.info(f"User logged in successfully: {user['id']} ({user['role']})")
        return self._token_for_user(user)

    async def verify_password_reset_identity(
        self, payload: PasswordResetVerifyRequest
    ) -> PasswordResetVerifyResponse:
        email = payload.email.lower().strip()
        phone = payload.phone.strip()

        clean_phone_10 = phone[-10:] if len(phone) >= 10 else phone
        user = await self.db.users.find_one({
            "email": email,
            "$or": [
                {"phone": phone},
                {"phone": clean_phone_10},
                {"phone": f"+91{clean_phone_10}"},
                {"phone": f"0{clean_phone_10}"},
            ],
        })

        if not user:
            logger.warning(f"Password reset failed identity check: {email} / {phone}")
            raise app_http_error(
                404,
                AppErrorCode.NOT_FOUND,
                "No account found matching this email and phone number.",
            )

        if not user.get("is_active", True):
            raise app_http_error(
                403,
                AppErrorCode.ACCOUNT_DISABLED,
                "Account is disabled. Please contact support.",
            )

        logger.info(f"Password reset identity verified for user {user['id']} ({email})")
        return PasswordResetVerifyResponse(name=user.get("name", "User"), verified=True)

    async def reset_password(self, payload: PasswordResetSubmitRequest) -> TokenResponse:
        email = payload.email.lower().strip()
        phone = payload.phone.strip()

        clean_phone_10 = phone[-10:] if len(phone) >= 10 else phone
        user = await self.db.users.find_one({
            "email": email,
            "$or": [
                {"phone": phone},
                {"phone": clean_phone_10},
                {"phone": f"+91{clean_phone_10}"},
                {"phone": f"0{clean_phone_10}"},
            ],
        })

        if not user:
            raise app_http_error(
                404,
                AppErrorCode.NOT_FOUND,
                "No account found matching this email and phone number.",
            )

        if not user.get("is_active", True):
            raise app_http_error(
                403,
                AppErrorCode.ACCOUNT_DISABLED,
                "Account is disabled. Please contact support.",
            )

        new_hash = hash_password(payload.new_password)
        now = datetime.now(UTC)
        await self.db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": new_hash, "updated_at": now}},
        )
        # ADR 0003 §6: a new password ends every existing session of this account.
        await SessionService(self.db).revoke_all_for_user(user["id"], "password_changed")

        await NotificationService(self.db).notify_user(
            user_id=user["id"],
            title="Password Changed",
            message="Your GharTak account password was successfully updated.",
            event_type="PASSWORD_RESET_SUCCESS",
            related_entity_type="user",
            related_entity_id=user["id"],
        )

        logger.info(f"Password reset successfully for user {user['id']} ({email})")
        updated_user = await self.db.users.find_one({"id": user["id"]})
        return self._token_for_user(updated_user or user)

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
        return TokenResponse(access_token=token, user=user)  # type: ignore

    async def _ensure_unique_contact(self, *, email: str | None, phone: str | None) -> None:
        existing_user = await self._find_by_contact(email=email, phone=phone)
        if existing_user:
            logger.warning(
                f"Registration conflict: Account exists for email={email}, phone={phone}"
            )
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

