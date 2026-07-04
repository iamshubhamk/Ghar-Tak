from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    user_id: str | None
    role: str | None
    title: str
    message: str
    event_type: str
    related_entity_type: str | None
    related_entity_id: str | None
    is_read: bool
    created_at: datetime
    read_at: datetime | None

