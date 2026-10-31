"""Sending email (T2-02). One small adapter, three backends chosen by EMAIL_BACKEND:

  * "log"    writes the message to the server log. For local development only, because a
             reset code in a log file is a secret leak;
  * "memory" keeps messages in a list (used by tests);
  * "smtp"   sends through any SMTP server (a free tier is enough). Uses only the standard library.
"""

import asyncio
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol

from app.core.config import get_settings
from app.core.logger import setup_logger

logger = setup_logger("ghartak.email")


@dataclass
class Email:
    to: str
    subject: str
    body: str


class EmailSender(Protocol):
    async def send(self, message: Email) -> None: ...


class LogEmailSender:
    async def send(self, message: Email) -> None:
        logger.info(f"[email, not sent] to={message.to} subject={message.subject}\n{message.body}")


class MemoryEmailSender:
    def __init__(self) -> None:
        self.outbox: list[Email] = []

    async def send(self, message: Email) -> None:
        self.outbox.append(message)


class SmtpEmailSender:
    async def send(self, message: Email) -> None:
        # smtplib blocks, so it runs in a worker thread and never stalls the API.
        await asyncio.to_thread(self._send_blocking, message)

    @staticmethod
    def _send_blocking(message: Email) -> None:
        settings = get_settings()
        mail = EmailMessage()
        mail["From"] = settings.smtp_from
        mail["To"] = message.to
        mail["Subject"] = message.subject
        mail.set_content(message.body)
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_starttls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(mail)


_memory_sender = MemoryEmailSender()


def get_email_sender() -> EmailSender:
    backend = get_settings().email_backend.strip().lower()
    if backend == "smtp":
        return SmtpEmailSender()
    if backend == "memory":
        return _memory_sender
    return LogEmailSender()


def memory_outbox() -> list[Email]:
    """The messages the "memory" backend has collected (tests)."""
    return _memory_sender.outbox
