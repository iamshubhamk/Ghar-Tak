from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class NotificationMessage:
    user_id: str
    title: str
    body: str
    channel: str = "in_app"


class NotificationService(Protocol):
    def send(self, message: NotificationMessage) -> None:
        """Send or store a notification."""


class InAppNotificationService:
    def send(self, message: NotificationMessage) -> None:
        # Database persistence will be added with the notification module.
        return None


class SmsNotificationService:
    def send(self, message: NotificationMessage) -> None:
        raise NotImplementedError("SMS provider is a paid-ready adapter, not used in MVP.")
