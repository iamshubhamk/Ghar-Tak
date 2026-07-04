from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import BookingStatus, ReviewStatus, UserRole
from app.core.errors import AppErrorCode, app_http_error
from app.db.init_db import ensure_booking_schema_for_session, ensure_review_schema_for_session
from app.models.booking import Booking, Review
from app.models.user import ProviderProfile, User
from app.schemas.review import ReviewCreateRequest


class ReviewService:
    def __init__(self, db: Session) -> None:
        self.db = db
        ensure_booking_schema_for_session(self.db)
        ensure_review_schema_for_session(self.db)

    def create(self, customer: User, booking_id: str, payload: ReviewCreateRequest) -> Review:
        if customer.role != UserRole.CUSTOMER.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only customers can review bookings.")

        booking = self._get_booking(booking_id)
        if booking.customer_id != customer.id:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "You can only review your bookings.")
        if booking.status != BookingStatus.COMPLETED.value or not booking.provider_id:
            raise app_http_error(
                422,
                AppErrorCode.REVIEW_NOT_ALLOWED,
                "Review is allowed only after an assigned booking is completed.",
            )

        existing = self.db.execute(
            select(Review).where(Review.booking_id == booking.id)
        ).scalar_one_or_none()
        if existing:
            raise app_http_error(
                409,
                AppErrorCode.REVIEW_NOT_ALLOWED,
                "This booking has already been reviewed.",
            )

        review = Review(
            booking_id=booking.id,
            customer_id=customer.id,
            provider_id=booking.provider_id,
            rating=payload.rating,
            comment=payload.comment,
        )
        self.db.add(review)
        self.db.flush()
        self._recalculate_provider_rating(booking.provider_id)
        self.db.commit()
        return self._get_review(review.id)

    def list_for_provider(self, provider_id: str) -> list[Review]:
        statement = (
            self._base_review_query()
            .where(Review.provider_id == provider_id, Review.status == ReviewStatus.VISIBLE.value)
            .order_by(Review.created_at.desc())
        )
        return list(self.db.execute(statement).scalars())

    def list_admin(self) -> list[Review]:
        statement = self._base_review_query().order_by(Review.created_at.desc())
        return list(self.db.execute(statement).scalars())

    def hide(self, admin: User, review_id: str) -> Review:
        if admin.role != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can moderate reviews.")

        review = self._get_review(review_id)
        review.status = ReviewStatus.HIDDEN_BY_ADMIN.value
        self.db.flush()
        self._recalculate_provider_rating(review.provider_id)
        self.db.commit()
        return self._get_review(review.id)

    def show(self, admin: User, review_id: str) -> Review:
        if admin.role != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can moderate reviews.")

        review = self._get_review(review_id)
        review.status = ReviewStatus.VISIBLE.value
        self.db.flush()
        self._recalculate_provider_rating(review.provider_id)
        self.db.commit()
        return self._get_review(review.id)

    @staticmethod
    def serialize(review: Review) -> dict:
        return {
            "id": review.id,
            "booking_id": review.booking_id,
            "customer_id": review.customer_id,
            "customer_name": review.customer.name,
            "provider_id": review.provider_id,
            "rating": review.rating,
            "comment": review.comment,
            "status": review.status,
            "created_at": review.created_at,
            "updated_at": review.updated_at,
        }

    def _get_booking(self, booking_id: str) -> Booking:
        booking = self.db.execute(
            select(Booking)
            .options(selectinload(Booking.customer), selectinload(Booking.provider))
            .where(Booking.id == booking_id)
        ).scalar_one_or_none()
        if not booking:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Booking not found.")
        return booking

    def _get_review(self, review_id: str) -> Review:
        review = self.db.execute(
            self._base_review_query().where(Review.id == review_id)
        ).scalar_one_or_none()
        if not review:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Review not found.")
        return review

    def _recalculate_provider_rating(self, provider_id: str) -> None:
        aggregate = self.db.execute(
            select(func.avg(Review.rating), func.count(Review.id)).where(
                Review.provider_id == provider_id,
                Review.status == ReviewStatus.VISIBLE.value,
            )
        ).one()
        average_rating = aggregate[0] or 0
        total_reviews = aggregate[1] or 0

        provider = self.db.get(ProviderProfile, provider_id)
        if provider:
            provider.average_rating = Decimal(str(round(float(average_rating), 2)))
            provider.total_reviews = int(total_reviews)

    @staticmethod
    def _base_review_query():
        return select(Review).options(
            selectinload(Review.customer),
            selectinload(Review.provider).selectinload(ProviderProfile.user),
        )
