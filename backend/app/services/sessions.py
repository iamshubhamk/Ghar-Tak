"""Rotating refresh tokens and logout (T2-01, ADR 0003).

A refresh token is an opaque random string. Only its SHA-256 hash is stored. Each use rotates it:
the old token is marked rotated and a new pair is issued. A rotated token that comes back within
the grace window is treated as a retry over a bad connection (the client never saw our reply); after
the window it is treated as theft and the whole family (one login) is revoked.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.errors import AppErrorCode, app_http_error
from app.core.logger import setup_logger
from app.core.security import create_access_token
from app.schemas.auth import TokenResponse

logger = setup_logger("ghartak.sessions")

CLIENTS = ("mobile", "admin_web")


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def normalise_client(value: str | None) -> str:
    """`X-Client: mobile` picks the long lifetime; anything else gets the shorter admin one."""
    cleaned = (value or "").strip().lower()
    return cleaned if cleaned in CLIENTS else "admin_web"


def _aware(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class SessionService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    # ---------- issuing ----------

    async def start_session(self, token: TokenResponse, client: str | None) -> TokenResponse:
        """Add a refresh token (a new family) to a login/register response."""
        user = dict(token.user) if isinstance(token.user, dict) else token.user.model_dump()
        family_id = str(uuid.uuid4())
        client_name = normalise_client(client)
        now = datetime.now(UTC)
        family_expires_at = now + self._family_lifetime(client_name)
        refresh = await self._issue(user["id"], family_id, client_name, now, family_expires_at)
        return self._response(token, refresh)

    async def refresh(self, raw_token: str) -> TokenResponse:
        record = await self.db.refresh_tokens.find_one(
            {"token_hash": hash_refresh_token(raw_token)}
        )
        if record is None:
            raise self._error(401, AppErrorCode.AUTH_REFRESH_INVALID, "Please log in again.")

        now = datetime.now(UTC)
        if record.get("revoked_at") is not None:
            # A revoked token came back: logout, an earlier theft response, or a thief.
            # Close the whole family.
            await self._revoke_family(record["family_id"], "reuse_of_revoked")
            raise self._error(
                401, AppErrorCode.AUTH_REFRESH_REUSED, "This session ended. Please log in again."
            )
        if _aware(record["expires_at"]) <= now or _aware(record["family_expires_at"]) <= now:
            raise self._error(
                401, AppErrorCode.AUTH_REFRESH_EXPIRED, "Your session expired. Please log in again."
            )

        user = await self.db.users.find_one({"id": record["user_id"]})
        if user is None or not user.get("is_active"):
            await self._revoke_family(record["family_id"], "user_disabled")
            raise self._error(403, AppErrorCode.ACCOUNT_DISABLED, "Account is disabled.")

        if record.get("rotated_at") is not None:
            return await self._handle_rotated(record, user, now)

        # First use of this token: rotate it. The filter makes two parallel calls safe.
        claimed = await self.db.refresh_tokens.update_one(
            {"id": record["id"], "rotated_at": None, "revoked_at": None},
            {"$set": {"rotated_at": now}},
        )
        if claimed.modified_count != 1:
            fresh = await self.db.refresh_tokens.find_one({"id": record["id"]})
            if fresh is None or fresh.get("revoked_at") is not None:
                raise self._error(401, AppErrorCode.AUTH_REFRESH_REUSED, "Please log in again.")
            return await self._handle_rotated(fresh, user, now)

        child = await self._issue(
            user["id"],
            record["family_id"],
            record["client"],
            now,
            _aware(record["family_expires_at"]),
            parent_id=record["id"],
        )
        await self._keep_only_newest_child(child)
        await self.db.refresh_tokens.update_one(
            {"id": record["id"]}, {"$set": {"replaced_by": child["id"]}}
        )
        return self._response(TokenResponse(access_token=self._access(user), user=user), child)

    async def _handle_rotated(
        self, record: dict[str, Any], user: dict[str, Any], now: datetime
    ) -> TokenResponse:
        grace = timedelta(seconds=get_settings().refresh_grace_seconds)
        if now - _aware(record["rotated_at"]) > grace:
            await self._revoke_family(record["family_id"], "reuse_after_grace")
            logger.warning(f"Refresh token reuse detected for user {record['user_id']}")
            raise self._error(
                401, AppErrorCode.AUTH_REFRESH_REUSED, "This session ended. Please log in again."
            )
        # A retry inside the grace window: the client never received our first reply. Cancel the
        # child we already issued so only the newest pair works, and issue a fresh pair.
        if record.get("replaced_by"):
            await self.db.refresh_tokens.update_one(
                {"id": record["replaced_by"], "revoked_at": None},
                {"$set": {"revoked_at": now, "revoke_reason": "grace_retry"}},
            )
        child = await self._issue(
            user["id"],
            record["family_id"],
            record["client"],
            now,
            _aware(record["family_expires_at"]),
            parent_id=record["id"],
        )
        await self._keep_only_newest_child(child)
        await self.db.refresh_tokens.update_one(
            {"id": record["id"]}, {"$set": {"replaced_by": child["id"]}}
        )
        return self._response(TokenResponse(access_token=self._access(user), user=user), child)

    async def _keep_only_newest_child(self, child: dict[str, Any]) -> None:
        """Two refreshes of the same token running at the same instant can each issue a child.
        Whichever child is newest (time, then id) is kept and the older siblings are revoked, so
        exactly one pair stays valid however the two calls interleave."""
        await self.db.refresh_tokens.update_many(
            {
                "parent_id": child["parent_id"],
                "revoked_at": None,
                "$or": [
                    {"created_at": {"$lt": child["created_at"]}},
                    {"created_at": child["created_at"], "id": {"$lt": child["id"]}},
                ],
            },
            {"$set": {"revoked_at": datetime.now(UTC), "revoke_reason": "superseded"}},
        )

    # ---------- ending ----------

    async def logout(self, raw_token: str | None, push_token: str | None = None) -> None:
        """Always succeeds, even for an unknown token, so it reveals nothing."""
        if not raw_token:
            return
        record = await self.db.refresh_tokens.find_one(
            {"token_hash": hash_refresh_token(raw_token)}
        )
        if record is None:
            return
        await self._revoke_family(record["family_id"], "logout")
        if push_token and push_token.strip():
            await self.db.users.update_one(
                {"id": record["user_id"]}, {"$pull": {"push_tokens": push_token.strip()}}
            )

    async def revoke_all_for_user(self, user_id: str, reason: str) -> None:
        """Password change, disable, account deletion: end every session of this user now."""
        now = datetime.now(UTC)
        await self.db.refresh_tokens.update_many(
            {"user_id": user_id, "revoked_at": None},
            {"$set": {"revoked_at": now, "revoke_reason": reason}},
        )
        # Access tokens issued before this moment stop working too.
        await self.db.users.update_one({"id": user_id}, {"$set": {"tokens_valid_after": now}})
        logger.info(f"All sessions of user {user_id} revoked ({reason}).")

    # ---------- internals ----------

    @staticmethod
    def _family_lifetime(client: str) -> timedelta:
        settings = get_settings()
        if client == "mobile":
            return timedelta(days=settings.refresh_mobile_absolute_days)
        return timedelta(hours=settings.refresh_admin_web_hours)

    @staticmethod
    def _child_expiry(client: str, now: datetime, family_expires_at: datetime) -> datetime:
        settings = get_settings()
        if client == "mobile":  # sliding window, capped by the family's absolute end
            return min(
                now + timedelta(days=settings.refresh_mobile_sliding_days), family_expires_at
            )
        return family_expires_at  # admin web: fixed, no sliding

    async def _issue(
        self,
        user_id: str,
        family_id: str,
        client: str,
        now: datetime,
        family_expires_at: datetime,
        parent_id: str | None = None,
    ) -> dict[str, Any]:
        raw = secrets.token_urlsafe(32)
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "family_id": family_id,
            "token_hash": hash_refresh_token(raw),
            "client": client,
            "created_at": now,
            "expires_at": self._child_expiry(client, now, family_expires_at),
            "family_expires_at": family_expires_at,
            "parent_id": parent_id,
            "rotated_at": None,
            "replaced_by": None,
            "revoked_at": None,
            "revoke_reason": None,
        }
        await self.db.refresh_tokens.insert_one(record)
        record["raw"] = raw
        return record

    async def _revoke_family(self, family_id: str, reason: str) -> None:
        await self.db.refresh_tokens.update_many(
            {"family_id": family_id, "revoked_at": None},
            {"$set": {"revoked_at": datetime.now(UTC), "revoke_reason": reason}},
        )

    @staticmethod
    def _access(user: dict[str, Any]) -> str:
        return create_access_token(subject=user["id"], role=user["role"])

    @staticmethod
    def _response(token: TokenResponse, refresh: dict[str, Any]) -> TokenResponse:
        token.refresh_token = refresh["raw"]
        token.expires_in = get_settings().jwt_access_token_minutes * 60
        return token

    @staticmethod
    def _error(status: int, code: str, message: str):
        return app_http_error(status, code, message)
