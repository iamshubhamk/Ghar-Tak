from datetime import UTC, datetime
from decimal import Decimal
import uuid
from typing import Any
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.enums import (
    BookingStatus,
    PaymentMode,
    PaymentStatus,
    UserRole,
    VerificationStatus,
)
from app.core.errors import AppErrorCode, app_http_error
from app.schemas.booking import BookingCreateRequest
from app.services.notifications import NotificationService
from app.core.logger import setup_logger

logger = setup_logger("ghartak.bookings")

class BookingService:
    provider_transitions = {
        "accept": (BookingStatus.REQUESTED, BookingStatus.ACCEPTED),
        "reject": (BookingStatus.REQUESTED, BookingStatus.REJECTED),
        "start": (BookingStatus.ACCEPTED, BookingStatus.IN_PROGRESS),
        "complete": (BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED),
    }

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def create(self, customer: dict[str, Any], payload: BookingCreateRequest) -> dict[str, Any]:
        if customer.get("role") != UserRole.CUSTOMER.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only customers can create bookings.")

        if payload.preferred_datetime.replace(tzinfo=UTC) <= datetime.now(UTC):
            raise app_http_error(
                422,
                AppErrorCode.VALIDATION_ERROR,
                "Preferred date and time must be in the future.",
            )

        category = await self.db.categories.find_one({"id": payload.category_id})
        if not category or not category.get("is_active"):
            raise app_http_error(404, AppErrorCode.CATEGORY_INACTIVE, "Category is not available.")

        booking_id = str(uuid.uuid4())
        now = datetime.now(UTC)
        
        provider = None
        if payload.provider_id:
            provider = await self._get_public_provider(payload.provider_id)
            category_names = provider.get("provider_profile", {}).get("category_names", [])
            if category["name"] not in category_names:
                raise app_http_error(
                    422,
                    AppErrorCode.VALIDATION_ERROR,
                    "Provider does not serve this category.",
                )

        booking = {
            "id": booking_id,
            "customer_id": customer["id"],
            "category_id": category["id"],
            "address": payload.address or payload.locality,
            "locality": payload.locality,
            "preferred_datetime": payload.preferred_datetime,
            "issue_description": payload.issue_description,
            "status": BookingStatus.REQUESTED.value,
            "payment_mode": PaymentMode.CASH_ON_SERVICE.value,
            "payment_status": PaymentStatus.CASH_PENDING.value,
            "final_amount": None,
            "created_at": now,
            "updated_at": now,
            "status_history": [],
            "provider_id": provider["id"] if provider else None,
        }
        
        await self.db.bookings.insert_one(booking)
        await self._record_history(booking, None, BookingStatus.REQUESTED, customer["id"])
        
        if provider:
            await NotificationService(self.db).notify_user(
                user_id=provider["id"],
                title="New booking request",
                message=f"{customer['name']} requested {category['name']} in {booking['locality']}.",
                event_type="BOOKING_REQUESTED",
                related_entity_type="booking",
                related_entity_id=booking["id"],
            )
        else:
            await NotificationService(self.db).notify_role(
                role=UserRole.ADMIN,
                title="New booking request",
                message=f"{customer['name']} requested {category['name']} in {booking['locality']}.",
                event_type="BOOKING_REQUESTED",
                related_entity_type="booking",
                related_entity_id=booking["id"],
            )
        
        logger.info(f"Booking {booking_id} created successfully by customer {customer['id']}")
        return await self._get(booking["id"])

    async def list_customer(self, customer: dict[str, Any]) -> list[dict[str, Any]]:
        cursor = self.db.bookings.find({"customer_id": customer["id"]}).sort("created_at", -1)
        return await self._populate_bookings(await cursor.to_list(length=None))

    async def list_admin(
        self,
        status: BookingStatus | None = None,
        category_id: str | None = None,
        provider_id: str | None = None,
    ) -> list[dict[str, Any]]:
        query = {}
        if status:
            query["status"] = status.value
        if category_id:
            query["category_id"] = category_id
        if provider_id:
            query["provider_id"] = provider_id

        cursor = self.db.bookings.find(query).sort("created_at", -1)
        return await self._populate_bookings(await cursor.to_list(length=None))

    async def assign_provider(
        self,
        admin: dict[str, Any],
        booking_id: str,
        provider_id: str,
        note: str | None = None,
    ) -> dict[str, Any]:
        if admin.get("role") != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can assign providers.")

        booking = await self._get(booking_id)
        if booking["status"] not in {BookingStatus.REQUESTED.value, BookingStatus.REJECTED.value}:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Provider can only be assigned while a request is pending or rejected.",
            )

        provider = await self._get_public_provider(provider_id)
        category_names = provider.get("provider_profile", {}).get("category_names", [])
        
        category = await self.db.categories.find_one({"id": booking["category_id"]})
        if not category or category["name"] not in category_names:
            raise app_http_error(
                422,
                AppErrorCode.VALIDATION_ERROR,
                "Provider does not serve this category.",
            )

        previous_status = BookingStatus(booking["status"])
        booking["provider_id"] = provider["id"]
        booking["status"] = BookingStatus.REQUESTED.value
        booking["updated_at"] = datetime.now(UTC)
        
        await self.db.bookings.update_one(
            {"id": booking["id"]},
            {"$set": {"provider_id": provider["id"], "status": BookingStatus.REQUESTED.value, "updated_at": booking["updated_at"]}}
        )
        
        await self._record_history(
            booking,
            previous_status,
            BookingStatus.REQUESTED,
            admin["id"],
            note or f"Assigned to {provider['name']}.",
        )
        await NotificationService(self.db).notify_user(
            user_id=booking["customer_id"],
            title="Provider assigned",
            message=(
                f"{provider['name']} has been assigned to your "
                f"{booking.get('category', {}).get('name', category['name'])} request."
            ),
            event_type="BOOKING_PROVIDER_ASSIGNED",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )
        customer = booking.get("customer", await self.db.users.find_one({"id": booking["customer_id"]}))
        await NotificationService(self.db).notify_user(
            user_id=provider["id"],
            title="New booking assigned",
            message=(
                f"{booking.get('category', {}).get('name', category['name'])} request from {customer['name']} "
                "is waiting for your response."
            ),
            event_type="BOOKING_ASSIGNED_TO_PROVIDER",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )
        
        logger.info(f"Provider {provider['id']} assigned to booking {booking_id} by admin {admin['id']}")
        return await self._get(booking["id"])

    async def list_provider(self, provider_user: dict[str, Any]) -> list[dict[str, Any]]:
        if not provider_user.get("provider_profile"):
            return []

        cursor = self.db.bookings.find({"provider_id": provider_user["id"]}).sort("created_at", -1)
        return await self._populate_bookings(await cursor.to_list(length=None))

    async def cancel_by_customer(
        self,
        customer: dict[str, Any],
        booking_id: str,
        note: str | None = None,
    ) -> dict[str, Any]:
        booking = await self._get(booking_id)
        if booking["customer_id"] != customer["id"]:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "You can only cancel your bookings.")

        if booking["status"] not in {BookingStatus.REQUESTED.value, BookingStatus.ACCEPTED.value}:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Booking cannot be cancelled after service has started.",
            )

        await self._transition(
            booking,
            BookingStatus.CANCELLED_BY_CUSTOMER,
            customer["id"],
            note,
        )
        return await self._get(booking["id"])

    async def admin_update_status(
        self,
        admin: dict[str, Any],
        booking_id: str,
        status: BookingStatus,
        note: str | None = None,
        final_amount: Decimal | None = None,
    ) -> dict[str, Any]:
        if admin.get("role") != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can update bookings.")

        booking = await self._get(booking_id)
        update_data = {}
        if status == BookingStatus.COMPLETED and final_amount is not None:
            update_data["final_amount"] = float(final_amount)
            
        if update_data:
            await self.db.bookings.update_one({"id": booking_id}, {"$set": update_data})
            
        await self._transition(booking, status, admin["id"], note or "Status updated by admin.")
        return await self._get(booking["id"])

    async def provider_action(
        self,
        provider_user: dict[str, Any],
        booking_id: str,
        action: str,
        note: str | None = None,
        final_amount: Decimal | None = None,
    ) -> dict[str, Any]:
        booking = await self._get(booking_id)
        if (
            not provider_user.get("provider_profile")
            or booking["provider_id"] != provider_user["id"]
        ):
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Booking is not assigned to you.")

        expected_status, next_status = self.provider_transitions[action]
        if booking["status"] != expected_status.value:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                f"Booking must be {expected_status.value} before this action.",
            )

        if next_status == BookingStatus.COMPLETED and final_amount is not None:
            await self.db.bookings.update_one({"id": booking_id}, {"$set": {"final_amount": float(final_amount)}})

        await self._transition(booking, next_status, provider_user["id"], note)
        return await self._get(booking["id"])

    async def mark_cash_paid(
        self,
        actor: dict[str, Any],
        booking_id: str,
        final_amount: Decimal | None = None,
        note: str | None = None,
    ) -> dict[str, Any]:
        booking = await self._get(booking_id)
        is_admin = actor.get("role") == UserRole.ADMIN.value
        is_assigned_provider = (
            actor.get("role") == UserRole.PROVIDER.value
            and actor.get("provider_profile")
            and booking["provider_id"] == actor["id"]
        )
        if not is_admin and not is_assigned_provider:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Booking is not assigned to you.")

        if booking["status"] != BookingStatus.COMPLETED.value:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Cash can be marked paid only after booking is completed.",
            )

        update_data = {"payment_status": PaymentStatus.PAID_CASH.value, "updated_at": datetime.now(UTC)}
        if final_amount is not None:
            update_data["final_amount"] = float(final_amount)
            
        await self.db.bookings.update_one({"id": booking_id}, {"$set": update_data})
        
        await NotificationService(self.db).notify_user(
            user_id=booking["customer_id"],
            title="Cash payment recorded",
            message=f"Cash payment for your {booking['category']['name']} booking has been marked paid.",
            event_type="BOOKING_PAYMENT_PAID",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )
        await self._record_history(
            booking,
            BookingStatus(booking["status"]),
            BookingStatus.COMPLETED,
            actor["id"],
            note or "Cash payment marked paid.",
        )
        
        logger.info(f"Cash payment recorded for booking {booking_id} by {actor['role']} {actor['id']}")
        return await self._get(booking["id"])

    @staticmethod
    def serialize(booking: dict[str, Any]) -> dict:
        return {
            "id": booking["id"],
            "customer_id": booking["customer_id"],
            "customer_name": booking.get("customer", {}).get("name"),
            "provider_id": booking.get("provider_id"),
            "provider_name": booking.get("provider", {}).get("name") if booking.get("provider") else None,
            "customer_email": booking.get("customer", {}).get("email"),
            "customer_phone": booking.get("customer", {}).get("phone"),
            "category_id": booking["category_id"],
            "category_name": booking.get("category", {}).get("name"),
            "address": booking.get("address"),
            "locality": booking.get("locality"),
            "preferred_datetime": booking.get("preferred_datetime"),
            "issue_description": booking.get("issue_description"),
            "status": booking.get("status"),
            "payment_mode": booking.get("payment_mode"),
            "payment_status": booking.get("payment_status"),
            "final_amount": booking.get("final_amount"),
            "created_at": booking.get("created_at"),
            "updated_at": booking.get("updated_at"),
        }

    async def _transition(
        self,
        booking: dict[str, Any],
        next_status: BookingStatus,
        actor_user_id: str,
        note: str | None,
    ) -> None:
        previous_status = BookingStatus(booking["status"])
        now = datetime.now(UTC)
        await self.db.bookings.update_one(
            {"id": booking["id"]},
            {"$set": {"status": next_status.value, "updated_at": now}}
        )
        booking["status"] = next_status.value
        booking["updated_at"] = now
        await self._record_history(booking, previous_status, next_status, actor_user_id, note)
        await self._notify_booking_status_change(booking, next_status)
        
        logger.info(f"Booking {booking['id']} status changed from {previous_status.value} to {next_status.value} by user {actor_user_id}")

    async def _record_history(
        self,
        booking: dict[str, Any],
        previous_status: BookingStatus | None,
        next_status: BookingStatus,
        actor_user_id: str,
        note: str | None = None,
    ) -> None:
        history_entry = {
            "from_status": previous_status.value if previous_status else None,
            "to_status": next_status.value,
            "actor_user_id": actor_user_id,
            "note": note,
            "created_at": datetime.now(UTC),
        }
        await self.db.bookings.update_one(
            {"id": booking["id"]},
            {"$push": {"status_history": history_entry}}
        )

    async def _notify_booking_status_change(
        self,
        booking: dict[str, Any],
        next_status: BookingStatus,
    ) -> None:
        notification_service = NotificationService(self.db)
        await notification_service.notify_user(
            user_id=booking["customer_id"],
            title="Booking status updated",
            message=f"Your {booking['category']['name']} booking is now {next_status.value}.",
            event_type="BOOKING_STATUS_CHANGED",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )
        if booking.get("provider_id"):
            await notification_service.notify_user(
                user_id=booking["provider_id"],
                title="Booking status updated",
                message=(
                    f"{booking['category']['name']} request for {booking['customer']['name']} "
                    f"is now {next_status.value}."
                ),
                event_type="BOOKING_STATUS_CHANGED",
                related_entity_type="booking",
                related_entity_id=booking["id"],
            )

    async def _get_public_provider(self, provider_id: str) -> dict[str, Any]:
        provider = await self.db.users.find_one({
            "id": provider_id,
            "role": UserRole.PROVIDER.value,
            "is_active": True,
            "provider_profile.verification_status": VerificationStatus.VERIFIED.value,
            "provider_profile.is_public": True,
        })
        if not provider:
            raise app_http_error(
                404,
                AppErrorCode.PROVIDER_NOT_VERIFIED,
                "Provider is not available.",
            )
        return provider

    async def _get(self, booking_id: str) -> dict[str, Any]:
        booking = await self.db.bookings.find_one({"id": booking_id})
        if not booking:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Booking not found.")
        return (await self._populate_bookings([booking]))[0]

    async def _populate_bookings(self, bookings: list[dict[str, Any]]) -> list[dict[str, Any]]:
        for booking in bookings:
            customer = await self.db.users.find_one({"id": booking["customer_id"]})
            booking["customer"] = customer
            
            category = await self.db.categories.find_one({"id": booking["category_id"]})
            booking["category"] = category
            
            if booking.get("provider_id"):
                provider = await self.db.users.find_one({"id": booking["provider_id"]})
                booking["provider"] = provider
        return bookings
