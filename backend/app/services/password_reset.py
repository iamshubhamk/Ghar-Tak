"""Password reset with a one-time code sent by email (T2-02, ADR 0003 §8).

Rules:
  * the code is 6 digits, valid for RESET_CODE_MINUTES, usable once, wrong tries are limited;
  * only a keyed hash of the code is stored, one active code per account;
  * asking for a code never reveals whether an account exists (the answer is always the same);
  * admin accounts never reset themselves this way; phone-only accounts have no email, so they
    reset through support;
  * a successful reset ends every session of that user (ADR 0003 §6).
"""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.enums import UserRole
from app.core.errors import AppErrorCode, app_http_error
from app.core.logger import setup_logger
from app.core.rate_limit import POLICIES, enabled, limiter
from app.core.security import hash_password
from app.schemas.auth import TokenResponse
from app.services.email import Email, get_email_sender
from app.services.notifications import NotificationService
from app.services.sessions import SessionService

logger = setup_logger("ghartak.password_reset")


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


class PasswordResetService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    # ---------- step 1: ask for a code ----------

    async def request_code(self, email: str) -> None:
        """Send a code if (and only if) a normal account with this email exists. Always returns."""
        address = email.strip().lower()
        user = await self.db.users.find_one({"email": address})
        if not self._may_reset_by_email(user):
            return  # unknown, admin, disabled: same silent outcome as a real account
        if enabled() and limiter.retry_after(f"reset_request:{address}", POLICIES["reset_request_account"]):
            logger.warning(f"Reset code requests for {address} are over the hourly limit")
            return  # silently, so the answer does not reveal anything
        limiter.record(f"reset_request:{address}", POLICIES["reset_request_account"])

        code = f"{secrets.randbelow(1_000_000):06d}"
        now = datetime.now(UTC)
        minutes = get_settings().reset_code_minutes
        await self.db.password_resets.replace_one(  # a new code replaces any earlier one
            {"user_id": user["id"]},
            {
                "user_id": user["id"],
                "code_hash": self._hash(user["id"], code),
                "created_at": now,
                "expires_at": now + timedelta(minutes=minutes),
                "attempts": 0,
            },
            upsert=True,
        )
        try:
            await get_email_sender().send(
                Email(
                    to=address,
                    subject="Your GharTak password reset code",
                    body=(
                        f"Your GharTak password reset code is {code}.\n"
                        f"It works for {minutes} minutes and can be used once.\n\n"
                        "If you did not ask for this, ignore this email: your password has not changed.\n\n"
                        f"आपका GharTak पासवर्ड रीसेट कोड {code} है। यह {minutes} मिनट तक चलेगा।\n"
                        "अगर आपने यह नहीं माँगा, तो इस ईमेल को अनदेखा करें।\n"
                    ),
                )
            )
        except Exception:  # noqa: BLE001 - the caller must not learn whether sending worked
            logger.exception(f"Could not send a reset code to user {user['id']}")

    # ---------- step 2: use the code ----------

    async def confirm(self, email: str, code: str, new_password: str) -> TokenResponse:
        address = email.strip().lower()
        user = await self.db.users.find_one({"email": address})
        if not self._may_reset_by_email(user):
            raise self._invalid()
        record = await self.db.password_resets.find_one({"user_id": user["id"]})
        if record is None or _aware(record["expires_at"]) <= datetime.now(UTC):
            raise self._invalid()

        if int(record.get("attempts", 0)) >= get_settings().reset_code_max_attempts:
            await self.db.password_resets.delete_one({"user_id": user["id"]})
            raise self._invalid()
        if not hmac.compare_digest(record["code_hash"], self._hash(user["id"], code.strip())):
            attempts = int(record.get("attempts", 0)) + 1
            if attempts >= get_settings().reset_code_max_attempts:
                await self.db.password_resets.delete_one({"user_id": user["id"]})
            else:
                await self.db.password_resets.update_one(
                    {"user_id": user["id"]}, {"$set": {"attempts": attempts}}
                )
            raise self._invalid()

        # One use only: whoever deletes the record first wins.
        claimed = await self.db.password_resets.delete_one(
            {"user_id": user["id"], "code_hash": record["code_hash"]}
        )
        if claimed.deleted_count != 1:
            raise self._invalid()

        now = datetime.now(UTC)
        await self.db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password_hash": hash_password(new_password), "updated_at": now}},
        )
        await SessionService(self.db).revoke_all_for_user(user["id"], "password_reset")
        await NotificationService(self.db).notify_user(
            user_id=user["id"],
            title="Password Changed",
            message="Your GharTak account password was successfully updated.",
            event_type="PASSWORD_RESET_SUCCESS",
            related_entity_type="user",
            related_entity_id=user["id"],
        )
        logger.info(f"Password reset by email code for user {user['id']}")
        fresh = await self.db.users.find_one({"id": user["id"]})
        from app.services.auth import AuthService  # avoid a circular import at module load

        return AuthService(self.db)._token_for_user(fresh or user)

    # ---------- helpers ----------

    @staticmethod
    def _may_reset_by_email(user: dict[str, Any] | None) -> bool:
        return bool(
            user
            and user.get("is_active")
            and user.get("role") != UserRole.ADMIN.value  # admins never use self-service reset
        )

    @staticmethod
    def _hash(user_id: str, code: str) -> str:
        key = get_settings().jwt_secret_key.encode("utf-8")
        return hmac.new(key, f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def _invalid():
        return app_http_error(
            400,
            AppErrorCode.RESET_CODE_INVALID,
            "The code is wrong or has expired. Ask for a new code.",
        )
