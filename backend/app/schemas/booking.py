from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.core.enums import BookingStatus, PaymentMode, PaymentStatus
from app.schemas.auth import clean_optional


class BookingCreateRequest(BaseModel):
    category_id: str = Field(min_length=1)
    address: str | None = Field(default=None, max_length=1000)
    locality: str = Field(min_length=2, max_length=120)
    preferred_datetime: datetime
    issue_description: str = Field(min_length=5, max_length=1200)

    @field_validator("address", "locality", "issue_description", mode="before")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return clean_optional(value)


class BookingStatusUpdateRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)
    final_amount: Decimal | None = Field(default=None, ge=0)

    @field_validator("note", mode="before")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return clean_optional(value)


class AdminBookingStatusUpdateRequest(BookingStatusUpdateRequest):
    status: BookingStatus


class CashPaymentRequest(BaseModel):
    final_amount: Decimal | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("note", mode="before")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return clean_optional(value)


class BookingAssignProviderRequest(BaseModel):
    provider_id: str = Field(min_length=1)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("note", mode="before")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return clean_optional(value)


class BookingResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    provider_id: str | None
    provider_name: str | None
    customer_email: str | None
    customer_phone: str | None
    category_id: str
    category_name: str
    address: str
    locality: str
    preferred_datetime: datetime
    issue_description: str
    status: BookingStatus
    payment_mode: PaymentMode
    payment_status: PaymentStatus
    final_amount: float | None
    created_at: datetime
    updated_at: datetime
