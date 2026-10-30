from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

from app.core.enums import BookingStatus, PaymentMode, PaymentStatus
from app.schemas.auth import clean_optional


class BookingItem(BaseModel):
    """What the customer picked in the cart. Shown to the provider; never used to price the job."""

    id: str
    name: str
    price: float = Field(default=0, ge=0)
    quantity: int = Field(default=1, ge=1)


class BookingCreateRequest(BaseModel):
    category_id: str = Field(min_length=1)
    provider_id: str | None = Field(default=None)
    address: str | None = Field(default=None, max_length=1000)
    locality: str = Field(min_length=2, max_length=120)
    house_number: str | None = Field(default=None, max_length=100)
    building_name: str | None = Field(default=None, max_length=150)
    landmark: str | None = Field(default=None, max_length=200)
    pincode: str | None = Field(default=None, max_length=20)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    preferred_datetime: datetime
    issue_description: str | None = Field(default=None, max_length=1200)
    items: list[BookingItem] = Field(default_factory=list)
    # Deprecated and ignored (T1-08): the server sets the price. Accepted until 2027-03-01.
    subtotal: float | None = Field(default=None, ge=0, deprecated=True)
    platform_fee: float | None = Field(default=None, ge=0, deprecated=True)
    discount: float | None = Field(default=None, ge=0, deprecated=True)
    total_amount: float | None = Field(default=None, ge=0, deprecated=True)

    @field_validator(
        "address",
        "locality",
        "house_number",
        "building_name",
        "landmark",
        "pincode",
        "issue_description",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return clean_optional(value)


class BookingStatusUpdateRequest(BaseModel):
    note: str | None = Field(default=None, max_length=500)
    # `final_amount` is the old way to price a job. Kept for shipped apps: it is read as
    # visit charge + extra (extra = final_amount - visit charge, at least 0). Prefer extra_amount.
    final_amount: Decimal | None = Field(default=None, ge=0, deprecated=True)
    extra_amount: Decimal | None = Field(default=None, ge=0, le=100000)
    extra_note: str | None = Field(default=None, max_length=300)
    otp: str | None = Field(default=None, max_length=10)

    @field_validator("note", "otp", "extra_note", mode="before")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return clean_optional(value)


class AdminBookingStatusUpdateRequest(BookingStatusUpdateRequest):
    status: BookingStatus


class BookingReleaseRequest(BaseModel):
    note: str = Field(min_length=3, max_length=500)

    @field_validator("note", mode="before")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        return clean_optional(value)


class CashPaymentRequest(BaseModel):
    final_amount: Decimal | None = Field(default=None, ge=0, deprecated=True)
    extra_amount: Decimal | None = Field(default=None, ge=0, le=100000)
    extra_note: str | None = Field(default=None, max_length=300)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("note", "extra_note", mode="before")
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
    house_number: str | None = None
    building_name: str | None = None
    landmark: str | None = None
    pincode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    preferred_datetime: datetime
    issue_description: str
    items: list[BookingItem] = Field(default_factory=list)
    status: BookingStatus
    payment_mode: PaymentMode
    payment_status: PaymentStatus
    final_amount: float | None = None
    total_amount: float | None = None
    visit_charge: float | None = None
    extra_amount: float | None = None
    extra_note: str | None = None
    offer_ends_at: datetime | None = None
    otp: str | None = None
    needs_admin_attention: bool = False
    otp_locked: bool = False
    created_at: datetime
    updated_at: datetime
