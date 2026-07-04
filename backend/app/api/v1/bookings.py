from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import require_roles
from app.core.enums import BookingStatus, UserRole
from app.db.session import get_db
from app.schemas.booking import (
    AdminBookingStatusUpdateRequest,
    BookingAssignProviderRequest,
    BookingCreateRequest,
    BookingResponse,
    BookingStatusUpdateRequest,
    CashPaymentRequest,
)
from app.services.bookings import BookingService

router = APIRouter(tags=["bookings"])


@router.post("/bookings", response_model=BookingResponse, status_code=201)
async def create_booking(
    payload: BookingCreateRequest,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).create(current_user, payload)
    return BookingService.serialize(booking)


@router.get("/bookings/my", response_model=list[BookingResponse])
async def list_my_bookings(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    bookings = await BookingService(db).list_customer(current_user)
    return [BookingService.serialize(booking) for booking in bookings]


@router.get("/admin/bookings", response_model=list[BookingResponse])
async def list_admin_bookings(
    status: BookingStatus | None = Query(default=None),
    category_id: str | None = Query(default=None),
    provider_id: str | None = Query(default=None),
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    bookings = await BookingService(db).list_admin(
        status=status,
        category_id=category_id,
        provider_id=provider_id,
    )
    return [BookingService.serialize(booking) for booking in bookings]


@router.patch("/admin/bookings/{booking_id}/assign", response_model=BookingResponse)
async def assign_booking_provider(
    booking_id: str,
    payload: BookingAssignProviderRequest,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).assign_provider(
        current_user,
        booking_id,
        payload.provider_id,
        payload.note,
    )
    return BookingService.serialize(booking)


@router.patch("/admin/bookings/{booking_id}/mark-cash-paid", response_model=BookingResponse)
async def admin_mark_cash_paid(
    booking_id: str,
    payload: CashPaymentRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).mark_cash_paid(
        current_user,
        booking_id,
        payload.final_amount if payload else None,
        payload.note if payload else None,
    )
    return BookingService.serialize(booking)


@router.patch("/admin/bookings/{booking_id}/status", response_model=BookingResponse)
async def admin_update_booking_status(
    booking_id: str,
    payload: AdminBookingStatusUpdateRequest,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).admin_update_status(
        current_user,
        booking_id,
        payload.status,
        payload.note,
        payload.final_amount,
    )
    return BookingService.serialize(booking)


@router.patch("/bookings/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: str,
    payload: BookingStatusUpdateRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).cancel_by_customer(
        current_user,
        booking_id,
        payload.note if payload else None,
    )
    return BookingService.serialize(booking)


@router.get("/provider/bookings", response_model=list[BookingResponse])
async def list_provider_bookings(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    bookings = await BookingService(db).list_provider(current_user)
    return [BookingService.serialize(booking) for booking in bookings]


@router.patch("/provider/bookings/{booking_id}/accept", response_model=BookingResponse)
async def accept_booking(
    booking_id: str,
    payload: BookingStatusUpdateRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).provider_action(
        current_user,
        booking_id,
        "accept",
        payload.note if payload else None,
    )
    return BookingService.serialize(booking)


@router.patch("/provider/bookings/{booking_id}/reject", response_model=BookingResponse)
async def reject_booking(
    booking_id: str,
    payload: BookingStatusUpdateRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).provider_action(
        current_user,
        booking_id,
        "reject",
        payload.note if payload else None,
    )
    return BookingService.serialize(booking)


@router.patch("/provider/bookings/{booking_id}/start", response_model=BookingResponse)
async def start_booking(
    booking_id: str,
    payload: BookingStatusUpdateRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).provider_action(
        current_user,
        booking_id,
        "start",
        payload.note if payload else None,
    )
    return BookingService.serialize(booking)


@router.patch("/provider/bookings/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(
    booking_id: str,
    payload: BookingStatusUpdateRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).provider_action(
        current_user,
        booking_id,
        "complete",
        payload.note if payload else None,
        payload.final_amount if payload else None,
    )
    return BookingService.serialize(booking)


@router.patch("/provider/bookings/{booking_id}/mark-cash-paid", response_model=BookingResponse)
async def provider_mark_cash_paid(
    booking_id: str,
    payload: CashPaymentRequest | None = None,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.PROVIDER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await BookingService(db).mark_cash_paid(
        current_user,
        booking_id,
        payload.final_amount if payload else None,
        payload.note if payload else None,
    )
    return BookingService.serialize(booking)
