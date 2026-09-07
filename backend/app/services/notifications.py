import uuid
from typing import Any
from datetime import UTC, datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.enums import UserRole
from app.core.errors import AppErrorCode, app_http_error

class NotificationService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def notify_user(
        self,
        *,
        user_id: str,
        title: str,
        message: str,
        event_type: str,
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
    ) -> None:
        now = datetime.now(UTC)
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "role": None,
            "title": title,
            "message": message,
            "event_type": event_type,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "is_read": False,
            "created_at": now,
            "read_at": None,
        }
        await self.db.notifications.insert_one(notification)
        await self.send_expo_push(
            user_id,
            title,
            message,
            data={"related_entity_type": related_entity_type, "related_entity_id": related_entity_id},
        )

    async def send_expo_push(
        self, user_id: str, title: str, message: str, data: dict[str, Any] | None = None
    ) -> None:
        user = await self.db.users.find_one({"id": user_id})
        if not user or not user.get("push_tokens"):
            return
        tokens = user.get("push_tokens", [])
        if not tokens:
            return

        import httpx

        messages = [
            {
                "to": token,
                "sound": "default",
                "title": title,
                "body": message,
                "data": data or {},
            }
            for token in tokens
        ]
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "https://exp.host/--/api/v2/push/send",
                    json=messages,
                    headers={"Accept": "application/json", "Content-Type": "application/json"},
                    timeout=5.0,
                )
        except Exception:
            pass


    async def notify_role(
        self,
        *,
        role: UserRole,
        title: str,
        message: str,
        event_type: str,
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
    ) -> None:
        now = datetime.now(UTC)
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": None,
            "role": role.value,
            "title": title,
            "message": message,
            "event_type": event_type,
            "related_entity_type": related_entity_type,
            "related_entity_id": related_entity_id,
            "is_read": False,
            "created_at": now,
            "read_at": None,
        }
        await self.db.notifications.insert_one(notification)

    async def list_for_user(self, user: dict[str, Any]) -> list[dict[str, Any]]:
        cursor = self.db.notifications.find({
            "$or": [
                {"user_id": user["id"]},
                {"role": user.get("role")}
            ]
        }).sort("created_at", -1)
        return await cursor.to_list(length=None)

    async def mark_read(self, user: dict[str, Any], notification_id: str) -> dict[str, Any]:
        notification = await self.db.notifications.find_one({
            "id": notification_id,
            "$or": [
                {"user_id": user["id"]},
                {"role": user.get("role")}
            ]
        })
        if not notification:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Notification not found.")

        now = datetime.now(UTC)
        await self.db.notifications.update_one(
            {"id": notification_id},
            {"$set": {"is_read": True, "read_at": now}}
        )
        notification["is_read"] = True
        notification["read_at"] = now
        return notification

    @staticmethod
    def serialize(notification: dict[str, Any]) -> dict:
        return {
            "id": notification["id"],
            "user_id": notification.get("user_id"),
            "role": notification.get("role"),
            "title": notification["title"],
            "message": notification["message"],
            "event_type": notification["event_type"],
            "related_entity_type": notification.get("related_entity_type"),
            "related_entity_id": notification.get("related_entity_id"),
            "is_read": notification["is_read"],
            "created_at": notification["created_at"],
            "read_at": notification.get("read_at"),
        }

