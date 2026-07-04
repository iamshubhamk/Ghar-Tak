from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import BookingStatus, UserRole, VerificationStatus
from app.models.booking import Booking
from app.models.user import CustomerProfile, ProviderProfile, User


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def dashboard_summary(self) -> dict:
        total_customers = self._count(User, User.role == UserRole.CUSTOMER.value)
        total_providers = self._count(User, User.role == UserRole.PROVIDER.value)
        pending_providers = self._count(
            ProviderProfile,
            ProviderProfile.verification_status == VerificationStatus.PENDING_VERIFICATION.value,
        )
        verified_providers = self._count(
            ProviderProfile,
            ProviderProfile.verification_status == VerificationStatus.VERIFIED.value,
        )
        total_bookings = self._count(Booking)
        completed_bookings = self._count(
            Booking,
            Booking.status == BookingStatus.COMPLETED.value,
        )
        open_statuses = {
            BookingStatus.REQUESTED.value,
            BookingStatus.ACCEPTED.value,
            BookingStatus.IN_PROGRESS.value,
        }
        open_bookings = self._count(Booking, Booking.status.in_(open_statuses))

        status_counts = self.db.execute(
            select(Booking.status, func.count(Booking.id)).group_by(Booking.status)
        ).all()

        return {
            "total_customers": total_customers,
            "total_providers": total_providers,
            "pending_providers": pending_providers,
            "verified_providers": verified_providers,
            "total_bookings": total_bookings,
            "open_bookings": open_bookings,
            "completed_bookings": completed_bookings,
            "booking_status_counts": [
                {"status": status, "count": count} for status, count in status_counts
            ],
        }

    def list_customers(self) -> list[User]:
        statement = (
            select(User)
            .options(selectinload(User.customer_profile))
            .where(User.role == UserRole.CUSTOMER.value)
            .order_by(User.created_at.desc())
        )
        return list(self.db.execute(statement).scalars())

    @staticmethod
    def serialize_customer(user: User) -> dict:
        profile: CustomerProfile | None = user.customer_profile
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
            "default_address": profile.default_address if profile else None,
            "default_locality": profile.default_locality if profile else None,
            "created_at": user.created_at,
        }

    def _count(self, model, *filters) -> int:
        statement = select(func.count()).select_from(model)
        if filters:
            statement = statement.where(*filters)
        return int(self.db.execute(statement).scalar_one())

