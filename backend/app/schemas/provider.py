from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.enums import AvailabilityStatus, VerificationStatus
from app.schemas.auth import clean_optional


class ProviderProfileUpdateRequest(BaseModel):
    bio: str | None = Field(default=None, max_length=1000)
    experience_years: int | None = Field(default=None, ge=0, le=60)
    price_note: str | None = Field(default=None, max_length=255)
    category_ids: list[str] | None = Field(default=None, max_length=12)
    localities: list[str] | None = Field(default=None, max_length=20)

    @field_validator("bio", "price_note", mode="before")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return clean_optional(value)

    @field_validator("category_ids", "localities")
    @classmethod
    def clean_lists(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None

        cleaned: list[str] = []
        seen: set[str] = set()

        for value in values:
            item = clean_optional(value)
            if item and item.lower() not in seen:
                cleaned.append(item)
                seen.add(item.lower())

        return cleaned


class AvailabilityUpdateRequest(BaseModel):
    availability_status: AvailabilityStatus


class ProviderPublicResponse(BaseModel):
    id: str
    user_id: str
    name: str
    phone: str | None = None
    bio: str | None = None
    experience_years: int
    verification_status: VerificationStatus
    availability_status: AvailabilityStatus
    price_note: str | None = None
    average_rating: float
    total_reviews: int
    is_public: bool
    categories: list[str]
    localities: list[str]
    created_at: datetime
    updated_at: datetime


class ProviderVerificationActionRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)

    @field_validator("note", mode="before")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return clean_optional(value)


class ProviderDocumentResponse(BaseModel):
    id: str
    file_name: str
    file_path: str
    file_type: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
