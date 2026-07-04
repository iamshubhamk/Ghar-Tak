from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import (
    BookingStatus,
    PaymentMode,
    PaymentStatus,
    UserRole,
    VerificationStatus,
)
from app.core.errors import AppErrorCode, app_http_error
from app.db.init_db import ensure_booking_schema_for_session
from app.models.booking import Booking, BookingStatusHistory
from app.models.catalog import Category, ProviderCategory
from app.models.user import ProviderProfile, User
from app.schemas.booking import BookingCreateRequest
from app.services.notifications import NotificationService


class BookingService:
    provider_transitions = {
        "accept": (BookingStatus.REQUESTED, BookingStatus.ACCEPTED),
        "reject": (BookingStatus.REQUESTED, BookingStatus.REJECTED),
        "start": (BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS),
        "complete": (BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED),
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        ensure_booking_schema_for_session(self.db)

    def create(self, customer: User, payload: BookingCreateRequest) -> Booking:
        if customer.role != UserRole.CUSTOMER.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only customers can create bookings.")

        if payload.preferred_datetime <= datetime.now(UTC):
            raise app_http_error(
                422,
                AppErrorCode.VALIDATION_ERROR,
                "Preferred date and time must be in the future.",
            )

        category = self.db.get(Category, payload.category_id)
        if not category or not category.is_active:
            raise app_http_error(404, AppErrorCode.CATEGORY_INACTIVE, "Category is not available.")

        booking = Booking(
            customer_id=customer.id,
            category_id=category.id,
            address=payload.address or payload.locality,
            locality=payload.locality,
            preferred_datetime=payload.preferred_datetime,
            issue_description=payload.issue_description,
            status=BookingStatus.REQUESTED.value,
            payment_mode=PaymentMode.CASH_ON_SERVICE.value,
            payment_status=PaymentStatus.CASH_PENDING.value,
        )
        self.db.add(booking)
        self.db.flush()
        self._record_history(booking, None, BookingStatus.REQUESTED, customer.id)
        NotificationService(self.db).notify_role(
            role=UserRole.ADMIN,
            title="New booking request",
            message=f"{customer.name} requested {category.name} in {booking.locality}.",
            event_type="BOOKING_REQUESTED",
            related_entity_type="booking",
            related_entity_id=booking.id,
        )
        self.db.commit()
        return self._get(booking.id)

    def list_customer(self, customer: User) -> list[Booking]:
        statement = (
            self._base_query()
            .where(Booking.customer_id == customer.id)
            .order_by(Booking.created_at.desc())
        )
        return list(self.db.execute(statement).scalars())

    def list_admin(
        self,
        status: BookingStatus | None = None,
        category_id: str | None = None,
        provider_id: str | None = None,
    ) -> list[Booking]:
        statement = self._base_query()
        if status:
            statement = statement.where(Booking.status == status.value)
        if category_id:
            statement = statement.where(Booking.category_id == category_id)
        if provider_id:
            statement = statement.where(Booking.provider_id == provider_id)

        statement = statement.order_by(Booking.created_at.desc())
        return list(self.db.execute(statement).scalars())

    def assign_provider(
        self,
        admin: User,
        booking_id: str,
        provider_id: str,
        note: str | None = None,
    ) -> Booking:
        if admin.role != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can assign providers.")

        booking = self._get(booking_id)
        if booking.status not in {BookingStatus.REQUESTED.value, BookingStatus.REJECTED.value}:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Provider can only be assigned while a request is pending or rejected.",
            )

        provider = self._get_public_provider(provider_id)
        provider_category_ids = {link.category_id for link in provider.category_links}
        if booking.category_id not in provider_category_ids:
            raise app_http_error(
                422,
                AppErrorCode.VALIDATION_ERROR,
                "Provider does not serve this category.",
            )

        previous_status = booking.status
        booking.provider_id = provider.id
        booking.status = BookingStatus.REQUESTED.value
        self._record_history(
            booking,
            previous_status,
            BookingStatus.REQUESTED,
            admin.id,
            note or f"Assigned to {provider.user.name}.",
        )
        NotificationService(self.db).notify_user(
            user_id=booking.customer_id,
            title="Provider assigned",
            message=(
                f"{provider.user.name} has been assigned to your "
                f"{booking.category.name} request."
            ),
            event_type="BOOKING_PROVIDER_ASSIGNED",
            related_entity_type="booking",
            related_entity_id=booking.id,
        )
        NotificationService(self.db).notify_user(
            user_id=provider.user_id,
            title="New booking assigned",
            message=(
                f"{booking.category.name} request from {booking.customer.name} "
                "is waiting for your response."
            ),
            event_type="BOOKING_ASSIGNED_TO_PROVIDER",
            related_entity_type="booking",
            related_entity_id=booking.id,
        )
        self.db.commit()
        return self._get(booking.id)

    def list_provider(self, provider_user: User) -> list[Booking]:
        if not provider_user.provider_profile:
            return []

        statement = (
            self._base_query()
            .where(Booking.provider_id == provider_user.provider_profile.id)
            .order_by(Booking.created_at.desc())
        )
        return list(self.db.execute(statement).scalars())

    def cancel_by_customer(
        self,
        customer: User,
        booking_id: str,
        note: str | None = None,
    ) -> Booking:
        booking = self._get(booking_id)
        if booking.customer_id != customer.id:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "You can only cancel your bookings.")

        if booking.status not in {BookingStatus.REQUESTED.value, BookingStatus.ACCEPTED.value}:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Booking cannot be cancelled after service has started.",
            )

        self._transition(
            booking,
            BookingStatus.CANCELLED_BY_CUSTOMER,
            customer.id,
            note,
        )
        return self._get(booking.id)

    def admin_update_status(
        self,
        admin: User,
        booking_id: str,
        status: BookingStatus,
        note: str | None = None,
        final_amount: Decimal | None = None,
    ) -> Booking:
        if admin.role != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can update bookings.")

        booking = self._get(booking_id)
        if status == BookingStatus.COMPLETED and final_amount is not None:
            booking.final_amount = final_amount
        self._transition(booking, status, admin.id, note or "Status updated by admin.")
        return self._get(booking.id)

    def provider_action(
        self,
        provider_user: User,
        booking_id: str,
        action: str,
        note: str | None = None,
        final_amount: Decimal | None = None,
    ) -> Booking:
        booking = self._get(booking_id)
        if (
            not provider_user.provider_profile
            or booking.provider_id != provider_user.provider_profile.id
        ):
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Booking is not assigned to you.")

        expected_status, next_status = self.provider_transitions[action]
        if booking.status != expected_status.value:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                f"Booking must be {expected_status.value} before this action.",
            )

        if next_status == BookingStatus.COMPLETED:
            booking.final_amount = final_amount

        self._transition(booking, next_status, provider_user.id, note)
        return self._get(booking.id)

    def mark_cash_paid(
        self,
        actor: User,
        booking_id: str,
        final_amount: Decimal | None = None,
        note: str | None = None,
    ) -> Booking:
        booking = self._get(booking_id)
        is_admin = actor.role == UserRole.ADMIN.value
        is_assigned_provider = (
            actor.role == UserRole.PROVIDER.value
            and actor.provider_profile
            and booking.provider_id == actor.provider_profile.id
        )
        if not is_admin and not is_assigned_provider:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Booking is not assigned to you.")

        if booking.status != BookingStatus.COMPLETED.value:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Cash can be marked paid only after booking is completed.",
            )

        if final_amount is not None:
            booking.final_amount = final_amount
        booking.payment_status = PaymentStatus.PAID_CASH.value
        NotificationService(self.db).notify_user(
            user_id=booking.customer_id,
            title="Cash payment recorded",
            message=f"Cash payment for your {booking.category.name} booking has been marked paid.",
            event_type="BOOKING_PAYMENT_PAID",
            related_entity_type="booking",
            related_entity_id=booking.id,
        )
        self._record_history(
            booking,
            booking.status,
            BookingStatus.COMPLETED,
            actor.id,
            note or "Cash payment marked paid.",
        )
        self.db.commit()
        return self._get(booking.id)

    @staticmethod
    def serialize(booking: Booking) -> dict:
        return {
            "id": booking.id,
            "customer_id": booking.customer_id,
            "customer_name": booking.customer.name,
            "provider_id": booking.provider_id,
            "provider_name": booking.provider.user.name if booking.provider else None,
            "customer_email": booking.customer.email,
            "customer_phone": booking.customer.phone,
            "category_id": booking.category_id,
            "category_name": booking.category.name,
            "address": booking.address,
            "locality": booking.locality,
            "preferred_datetime": booking.preferred_datetime,
            "issue_description": booking.issue_description,
            "status": booking.status,
            "payment_mode": booking.payment_mode,
            "payment_status": booking.payment_status,
            "final_amount": (
                float(booking.final_amount) if booking.final_amount is not None else None
            ),
            "created_at": booking.created_at,
            "updated_at": booking.updated_at,
        }

    def _transition(
        self,
        booking: Booking,
        next_status: BookingStatus,
        actor_user_id: str,
        note: str | None,
    ) -> None:
        previous_status = booking.status
        booking.status = next_status.value
        self._record_history(booking, previous_status, next_status, actor_user_id, note)
        self._notify_booking_status_change(booking, next_status)
        self.db.commit()

    def _record_history(
        self,
        booking: Booking,
        previous_status: str | None,
        next_status: BookingStatus,
        actor_user_id: str,
        note: str | None = None,
    ) -> None:
        self.db.add(
            BookingStatusHistory(
                booking_id=booking.id,
                from_status=previous_status,
                to_status=next_status.value,
                actor_user_id=actor_user_id,
                note=note,
            )
        )

    def _notify_booking_status_change(
        self,
        booking: Booking,
        next_status: BookingStatus,
    ) -> None:
        notification_service = NotificationService(self.db)
        notification_service.notify_user(
            user_id=booking.customer_id,
            title="Booking status updated",
            message=f"Your {booking.category.name} booking is now {next_status.value}.",
            event_type="BOOKING_STATUS_CHANGED",
            related_entity_type="booking",
            related_entity_id=booking.id,
        )
        if booking.provider:
            notification_service.notify_user(
                user_id=booking.provider.user_id,
                title="Booking status updated",
                message=(
                    f"{booking.category.name} request for {booking.customer.name} "
                    f"is now {next_status.value}."
                ),
                event_type="BOOKING_STATUS_CHANGED",
                related_entity_type="booking",
                related_entity_id=booking.id,
            )

    def _get_public_provider(self, provider_id: str) -> ProviderProfile:
        statement = (
            self._provider_query()
            .where(
                ProviderProfile.id == provider_id,
                ProviderProfile.verification_status == VerificationStatus.VERIFIED.value,
                ProviderProfile.is_public.is_(True),
            )
        )
        provider = self.db.execute(statement).scalar_one_or_none()
        if not provider or not provider.user.is_active:
            raise app_http_error(
                404,
                AppErrorCode.PROVIDER_NOT_VERIFIED,
                "Provider is not available.",
            )
        return provider

    def _get(self, booking_id: str) -> Booking:
        booking = self.db.execute(
            self._base_query().where(Booking.id == booking_id)
        ).scalar_one_or_none()
        if not booking:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Booking not found.")
        return booking

    @staticmethod
    def _base_query():
        return select(Booking).options(
            selectinload(Booking.customer),
            selectinload(Booking.provider).selectinload(ProviderProfile.user),
            selectinload(Booking.category),
        )

    @staticmethod
    def _provider_query():
        return select(ProviderProfile).options(
            selectinload(ProviderProfile.user),
            selectinload(ProviderProfile.category_links).selectinload(ProviderCategory.category),
            selectinload(ProviderProfile.localities),
        )
