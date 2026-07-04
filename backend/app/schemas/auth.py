from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.enums import AvailabilityStatus, UserRole, VerificationStatus


def clean_optional(value: str | None) -> str | None:
    if value is None:
        return None

    stripped = value.strip()
    return stripped or None


class ContactMixin(BaseModel):
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=30)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        cleaned = clean_optional(value)
        return cleaned.lower() if cleaned else None

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        return clean_optional(value)

    @model_validator(mode="after")
    def require_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required.")
        return self


class CustomerRegisterRequest(ContactMixin):
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    default_address: str | None = Field(default=None, max_length=500)
    default_locality: str | None = Field(default=None, max_length=120)

    @field_validator("name", "default_address", "default_locality", mode="before")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return clean_optional(value)


class ProviderRegisterRequest(ContactMixin):
    name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    bio: str | None = Field(default=None, max_length=1000)
    experience_years: int = Field(default=0, ge=0, le=60)
    price_note: str | None = Field(default=None, max_length=255)
    category_ids: list[str] = Field(default_factory=list, max_length=12)
    localities: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("name", "bio", "price_note", mode="before")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return clean_optional(value)

    @field_validator("category_ids", "localities")
    @classmethod
    def clean_lists(cls, values: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()

        for value in values:
            item = clean_optional(value)
            if item and item.lower() not in seen:
                cleaned.append(item)
                seen.add(item.lower())

        return cleaned


class LoginRequest(ContactMixin):
    password: str = Field(min_length=1, max_length=128)


class CustomerProfileResponse(BaseModel):
    default_address: str | None = None
    default_locality: str | None = None
    profile_photo_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ProviderProfileResponse(BaseModel):
    bio: str | None = None
    experience_years: int
    verification_status: VerificationStatus
    rejection_reason: str | None = None
    profile_photo_url: str | None = None
    adhaar_card_url: str | None = None
    availability_status: AvailabilityStatus
    price_note: str | None = None
    average_rating: float
    total_reviews: int
    is_public: bool
    categories: list[str] = Field(default_factory=list, validation_alias="category_names")
    localities: list[str] = Field(default_factory=list, validation_alias="locality_names")

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime
    customer_profile: CustomerProfileResponse | None = None
    provider_profile: ProviderProfileResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
