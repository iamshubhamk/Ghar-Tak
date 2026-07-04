from datetime import datetime

from pydantic import BaseModel

from app.core.enums import BookingStatus, UserRole


class BookingStatusCount(BaseModel):
    status: BookingStatus
    count: int


class AdminDashboardSummary(BaseModel):
    total_customers: int
    total_providers: int
    pending_providers: int
    verified_providers: int
    total_bookings: int
    open_bookings: int
    completed_bookings: int
    booking_status_counts: list[BookingStatusCount]


class AdminCustomerResponse(BaseModel):
    id: str
    name: str
    email: str | None
    phone: str | None
    role: UserRole
    is_active: bool
    default_address: str | None
    default_locality: str | None
    created_at: datetime

