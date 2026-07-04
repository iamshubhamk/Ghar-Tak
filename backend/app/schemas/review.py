from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.enums import ReviewStatus
from app.schemas.auth import clean_optional


class ReviewCreateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1200)

    @field_validator("comment", mode="before")
    @classmethod
    def strip_comment(cls, value: str | None) -> str | None:
        return clean_optional(value)


class ReviewResponse(BaseModel):
    id: str
    booking_id: str
    customer_id: str
    customer_name: str
    provider_id: str
    rating: int
    comment: str | None
    status: ReviewStatus
    created_at: datetime
    updated_at: datetime
