from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.core.errors import AppErrorCode, app_http_error
from app.db.init_db import ensure_notification_schema_for_session
from app.models.booking import Notification
from app.models.user import User, utc_now


class NotificationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        ensure_notification_schema_for_session(self.db)

    def notify_user(
        self,
        *,
        user_id: str,
        title: str,
        message: str,
        event_type: str,
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
    ) -> None:
        self.db.add(
            Notification(
                user_id=user_id,
                title=title,
                message=message,
                event_type=event_type,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
            )
        )

    def notify_role(
        self,
        *,
        role: UserRole,
        title: str,
        message: str,
        event_type: str,
        related_entity_type: str | None = None,
        related_entity_id: str | None = None,
    ) -> None:
        self.db.add(
            Notification(
                role=role.value,
                title=title,
                message=message,
                event_type=event_type,
                related_entity_type=related_entity_type,
                related_entity_id=related_entity_id,
            )
        )

    def list_for_user(self, user: User) -> list[Notification]:
        statement = (
            select(Notification)
            .where(or_(Notification.user_id == user.id, Notification.role == user.role))
            .order_by(Notification.created_at.desc())
        )
        return list(self.db.execute(statement).scalars())

    def mark_read(self, user: User, notification_id: str) -> Notification:
        notification = self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                or_(Notification.user_id == user.id, Notification.role == user.role),
            )
        ).scalar_one_or_none()
        if not notification:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Notification not found.")

        notification.is_read = True
        notification.read_at = utc_now()
        self.db.commit()
        return notification

    @staticmethod
    def serialize(notification: Notification) -> dict:
        return {
            "id": notification.id,
            "user_id": notification.user_id,
            "role": notification.role,
            "title": notification.title,
            "message": notification.message,
            "event_type": notification.event_type,
            "related_entity_type": notification.related_entity_type,
            "related_entity_id": notification.related_entity_id,
            "is_read": notification.is_read,
            "created_at": notification.created_at,
            "read_at": notification.read_at,
        }

