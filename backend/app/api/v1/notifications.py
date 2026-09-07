from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.notification import NotificationResponse, PushTokenRequest
from app.services.notifications import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/push-token")
async def register_push_token(
    payload: PushTokenRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    token = payload.push_token.strip()
    if token:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$addToSet": {"push_tokens": token}}
        )
    return {"message": "Push token registered successfully"}


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    notifications = await NotificationService(db).list_for_user(current_user)
    return [NotificationService.serialize(notification) for notification in notifications]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    notification = await NotificationService(db).mark_read(current_user, notification_id)
    return NotificationService.serialize(notification)


