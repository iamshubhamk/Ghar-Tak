from decimal import Decimal
import uuid
from typing import Any
from datetime import UTC, datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.enums import BookingStatus, ReviewStatus, UserRole
from app.core.errors import AppErrorCode, app_http_error
from app.schemas.review import ReviewCreateRequest

class ReviewService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def create(self, customer: dict[str, Any], booking_id: str, payload: ReviewCreateRequest) -> dict[str, Any]:
        if customer.get("role") != UserRole.CUSTOMER.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only customers can review bookings.")

        booking = await self._get_booking(booking_id)
        if booking["customer_id"] != customer["id"]:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "You can only review your bookings.")
        if booking["status"] != BookingStatus.COMPLETED.value or not booking.get("provider_id"):
            raise app_http_error(
                422,
                AppErrorCode.REVIEW_NOT_ALLOWED,
                "Review is allowed only after an assigned booking is completed.",
            )

        existing = await self.db.reviews.find_one({"booking_id": booking["id"]})
        if existing:
            raise app_http_error(
                409,
                AppErrorCode.REVIEW_NOT_ALLOWED,
                "This booking has already been reviewed.",
            )

        now = datetime.now(UTC)
        review_doc = {
            "id": str(uuid.uuid4()),
            "booking_id": booking["id"],
            "customer_id": customer["id"],
            "provider_id": booking["provider_id"],
            "rating": payload.rating,
            "comment": payload.comment,
            "status": ReviewStatus.VISIBLE.value,
            "created_at": now,
            "updated_at": now,
        }
        await self.db.reviews.insert_one(review_doc)
        await self._recalculate_provider_rating(booking["provider_id"])
        
        return await self._get_review(review_doc["id"])

    async def list_for_provider(self, provider_id: str) -> list[dict[str, Any]]:
        cursor = self.db.reviews.find({
            "provider_id": provider_id,
            "status": ReviewStatus.VISIBLE.value
        }).sort("created_at", -1)
        return await self._populate_reviews(await cursor.to_list(length=None))

    async def list_admin(self) -> list[dict[str, Any]]:
        cursor = self.db.reviews.find({}).sort("created_at", -1)
        return await self._populate_reviews(await cursor.to_list(length=None))

    async def hide(self, admin: dict[str, Any], review_id: str) -> dict[str, Any]:
        if admin.get("role") != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can moderate reviews.")

        review = await self._get_review(review_id)
        await self.db.reviews.update_one(
            {"id": review_id},
            {"$set": {"status": ReviewStatus.HIDDEN_BY_ADMIN.value, "updated_at": datetime.now(UTC)}}
        )
        await self._recalculate_provider_rating(review["provider_id"])
        return await self._get_review(review_id)

    async def show(self, admin: dict[str, Any], review_id: str) -> dict[str, Any]:
        if admin.get("role") != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can moderate reviews.")

        review = await self._get_review(review_id)
        await self.db.reviews.update_one(
            {"id": review_id},
            {"$set": {"status": ReviewStatus.VISIBLE.value, "updated_at": datetime.now(UTC)}}
        )
        await self._recalculate_provider_rating(review["provider_id"])
        return await self._get_review(review_id)

    @staticmethod
    def serialize(review: dict[str, Any]) -> dict:
        return {
            "id": review["id"],
            "booking_id": review["booking_id"],
            "customer_id": review["customer_id"],
            "customer_name": review.get("customer", {}).get("name"),
            "provider_id": review["provider_id"],
            "rating": review["rating"],
            "comment": review.get("comment"),
            "status": review["status"],
            "created_at": review["created_at"],
            "updated_at": review["updated_at"],
        }

    async def _get_booking(self, booking_id: str) -> dict[str, Any]:
        booking = await self.db.bookings.find_one({"id": booking_id})
        if not booking:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Booking not found.")
        return booking

    async def _get_review(self, review_id: str) -> dict[str, Any]:
        review = await self.db.reviews.find_one({"id": review_id})
        if not review:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Review not found.")
        return (await self._populate_reviews([review]))[0]
        
    async def _populate_reviews(self, reviews: list[dict[str, Any]]) -> list[dict[str, Any]]:
        for review in reviews:
            customer = await self.db.users.find_one({"id": review["customer_id"]})
            review["customer"] = customer
            
            provider = await self.db.users.find_one({"id": review["provider_id"]})
            review["provider"] = provider
        return reviews

    async def _recalculate_provider_rating(self, provider_id: str) -> None:
        pipeline = [
            {
                "$match": {
                    "provider_id": provider_id,
                    "status": ReviewStatus.VISIBLE.value
                }
            },
            {
                "$group": {
                    "_id": "$provider_id",
                    "average_rating": {"$avg": "$rating"},
                    "total_reviews": {"$sum": 1}
                }
            }
        ]
        
        cursor = self.db.reviews.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        
        if result:
            average_rating = round(float(result[0]["average_rating"]), 2)
            total_reviews = result[0]["total_reviews"]
        else:
            average_rating = 0.0
            total_reviews = 0

        await self.db.users.update_one(
            {"id": provider_id},
            {
                "$set": {
                    "provider_profile.average_rating": average_rating,
                    "provider_profile.total_reviews": total_reviews
                }
            }
        )
