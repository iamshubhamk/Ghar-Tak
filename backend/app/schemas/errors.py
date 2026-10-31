"""Named error and message schemas for the OpenAPI contract (T2-07, ADR 0006 §3).

The error body the API sends today is `{"detail": {"error": {"code", "message", "details"}}}`.
T2-08 adds a second, flatter shape next to it; both are documented here.
"""

from typing import Any

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str = Field(description="Stable machine-readable code, for example BOOKING_INVALID_STATUS.")
    message: str = Field(description="A sentence that is safe to show to the user.")
    details: dict[str, Any] = Field(
        default_factory=dict, description="Extra facts (for example attempts_left); may be empty."
    )


class ErrorEnvelope(BaseModel):
    error: ErrorBody


class ErrorResponse(BaseModel):
    """What every 4xx answer carries (some older routes still send `detail` as a plain string)."""

    detail: ErrorEnvelope | str


class MessageResponse(BaseModel):
    message: str
