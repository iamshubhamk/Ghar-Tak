import secrets
import uuid
from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from app.core.config import get_settings
from app.core.enums import (
    BookingStatus,
    PaymentMode,
    PaymentStatus,
    UserRole,
    VerificationStatus,
)
from app.core.errors import AppErrorCode, app_http_error
from app.core.logger import setup_logger
from app.schemas.booking import BookingCreateRequest
from app.services.booking_rules import (
    PROVIDER_ACTION_TARGETS,
    Actor,
    ensure_assignable,
    ensure_transition,
)
from app.services.notifications import NotificationService

logger = setup_logger("ghartak.bookings")

IST = timezone(timedelta(hours=5, minutes=30))  # times without a zone are read as Patna time
MAX_START_OTP_ATTEMPTS = 5
PAST_TIME_GRACE = timedelta(minutes=5)

# Jobs that go back to the admin queue when their provider stops being VERIFIED (T1-06).
RELEASABLE_STATUSES = (
    BookingStatus.REQUESTED,
    BookingStatus.ACCEPTED,
    BookingStatus.ON_THE_WAY,
)


class BookingService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def create(
        self, customer: dict[str, Any], payload: BookingCreateRequest
    ) -> dict[str, Any]:
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

        preferred = payload.preferred_datetime
        if preferred.tzinfo is None:
            preferred = preferred.replace(tzinfo=IST)
        preferred = preferred.astimezone(UTC)
        if preferred < now - PAST_TIME_GRACE:
            raise app_http_error(
                422,
                AppErrorCode.VALIDATION_ERROR,
                "The preferred time is in the past. Please pick a time from now on.",
            )

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

        # Generate dynamic 4-digit cryptographic OTP for customer
        otp = f"{secrets.randbelow(9000) + 1000}"

        addr_parts = [
            payload.house_number,
            payload.building_name,
            payload.address,
            payload.landmark,
            payload.locality,
            payload.pincode,
        ]
        formatted_address = (
            ", ".join([p.strip() for p in addr_parts if p and p.strip()]) or payload.locality
        )

        item_dicts = [item.model_dump() for item in payload.items] if payload.items else []
        # T1-08: the server sets the price. Anything the client sent as totals is ignored.
        launch = get_settings()
        visit_charge = round(float(launch.launch_visit_charge_inr), 2)

        issue_desc = payload.issue_description
        if not issue_desc and item_dicts:
            issue_desc = ", ".join(
                [f"{it['name']} (x{it.get('quantity', 1)})" for it in item_dicts]
            )
        elif not issue_desc:
            issue_desc = f"{category['name']} Service Booking"

        booking = {
            "id": booking_id,
            "customer_id": customer["id"],
            "category_id": category["id"],
            "address": formatted_address,
            "locality": payload.locality,
            "house_number": payload.house_number,
            "building_name": payload.building_name,
            "landmark": payload.landmark,
            "pincode": payload.pincode,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "preferred_datetime": preferred,
            "issue_description": issue_desc,
            "items": item_dicts,
            "subtotal": visit_charge,
            "platform_fee": 0.0,
            "discount": 0.0,
            "visit_charge": visit_charge,
            "extra_amount": 0.0,
            "extra_note": None,
            "offer_ends_at": launch.launch_offer_ends_at,
            "total_amount": visit_charge,
            "otp": otp,
            "status": BookingStatus.REQUESTED.value,
            "payment_mode": PaymentMode.CASH_ON_SERVICE.value,
            "payment_status": PaymentStatus.CASH_PENDING.value,
            "final_amount": visit_charge,
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
                message=(
                    f"{customer['name']} requested {category['name']} in {booking['locality']}."
                ),
                event_type="BOOKING_REQUESTED",
                related_entity_type="booking",
                related_entity_id=booking["id"],
            )
        else:
            await NotificationService(self.db).notify_role(
                role=UserRole.ADMIN,
                title="New booking request",
                message=(
                    f"{customer['name']} requested {category['name']} in {booking['locality']}."
                ),
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
        ensure_assignable(BookingStatus(booking["status"]))

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
        previous_provider_id = booking.get("provider_id")
        booking["provider_id"] = provider["id"]
        booking["status"] = BookingStatus.REQUESTED.value
        booking["updated_at"] = datetime.now(UTC)

        # Compare-and-set (T1-05): still in the status we checked, and still the same provider.
        result = await self.db.bookings.update_one(
            {
                "id": booking["id"],
                "status": previous_status.value,
                "provider_id": previous_provider_id,
            },
            {
                "$set": {
                    "provider_id": provider["id"],
                    "status": BookingStatus.REQUESTED.value,
                    "updated_at": booking["updated_at"],
                }
            },
        )
        if result.modified_count != 1:
            raise self._state_changed_error(booking["id"])

        await self._record_history(
            booking,
            previous_status,
            BookingStatus.REQUESTED,
            admin["id"],
            note or f"Assigned to {provider['name']}.",
        )
        if previous_provider_id and previous_provider_id != provider["id"]:
            await NotificationService(self.db).notify_user(
                user_id=previous_provider_id,
                title="Booking reassigned",
                message=(
                    f"Booking #{booking['id'][:8]} was given to another provider and is "
                    "no longer yours."
                ),
                event_type="BOOKING_REASSIGNED_AWAY",
                related_entity_type="booking",
                related_entity_id=booking["id"],
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
        customer = booking.get(
            "customer", await self.db.users.find_one({"id": booking["customer_id"]})
        )
        await NotificationService(self.db).notify_user(
            user_id=provider["id"],
            title="New booking assigned",
            message=(
                f"{booking.get('category', {}).get('name', category['name'])} "
                f"request from {customer['name']} is waiting for your response."
            ),
            event_type="BOOKING_ASSIGNED_TO_PROVIDER",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )
        await NotificationService(self.db).notify_role(
            role=UserRole.ADMIN,
            title="Provider Assigned",
            message=(
                f"Booking #{booking['id'][:8]} assigned to {provider['name']}."
            ),
            event_type="BOOKING_PROVIDER_ASSIGNED",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )

        logger.info(
            f"Provider {provider['id']} assigned to booking {booking_id} by admin {admin['id']}"
        )
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

        ensure_transition(
            Actor.CUSTOMER, BookingStatus(booking["status"]), BookingStatus.CANCELLED_BY_CUSTOMER
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
        extra_amount: Decimal | None = None,
        extra_note: str | None = None,
    ) -> dict[str, Any]:
        if admin.get("role") != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can update bookings.")

        booking = await self._get(booking_id)
        ensure_transition(Actor.ADMIN, BookingStatus(booking["status"]), status)
        extra_fields = {}
        if status == BookingStatus.COMPLETED:
            extra_fields = self._price_fields(booking, final_amount, extra_amount, extra_note)

        await self._transition(
            booking, status, admin["id"], note or "Status updated by admin.", extra_fields
        )
        return await self._get(booking["id"])

    async def provider_action(
        self,
        provider_user: dict[str, Any],
        booking_id: str,
        action: str,
        note: str | None = None,
        final_amount: Decimal | None = None,
        otp: str | None = None,
        extra_amount: Decimal | None = None,
        extra_note: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_provider_verified(provider_user)
        booking = await self._get(booking_id)
        if (
            not provider_user.get("provider_profile")
            or booking["provider_id"] != provider_user["id"]
        ):
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Booking is not assigned to you.")

        next_status = PROVIDER_ACTION_TARGETS[action]
        ensure_transition(Actor.PROVIDER, BookingStatus(booking["status"]), next_status)

        if action in ("start", "in_progress"):
            if int(booking.get("otp_failed_attempts") or 0) >= MAX_START_OTP_ATTEMPTS:
                raise self._otp_locked_error()
            if not otp or not str(otp).strip():
                raise app_http_error(
                    400,
                    AppErrorCode.VALIDATION_ERROR,
                    "Customer 4-digit start OTP is required to begin service.",
                )
            expected_otp = str(booking.get("otp", "")).strip()
            if str(otp).strip() != expected_otp:
                updated = await self.db.bookings.find_one_and_update(
                    {"id": booking_id},
                    {"$inc": {"otp_failed_attempts": 1}},
                    return_document=ReturnDocument.AFTER,
                )
                attempts = (updated or {}).get("otp_failed_attempts", 1)
                if attempts >= MAX_START_OTP_ATTEMPTS:
                    await self._notify_otp_locked(booking)
                    raise self._otp_locked_error()
                raise app_http_error(
                    400,
                    AppErrorCode.VALIDATION_ERROR,
                    "Invalid OTP code. Please enter the 4-digit code shown on customer's tracker.",
                    {"attempts_left": MAX_START_OTP_ATTEMPTS - attempts},
                )

        extra_fields = {}
        if next_status == BookingStatus.COMPLETED:
            extra_fields = self._price_fields(booking, final_amount, extra_amount, extra_note)
        if action in ("start", "in_progress"):
            extra_fields["otp_failed_attempts"] = 0

        await self._transition(booking, next_status, provider_user["id"], note, extra_fields)
        return await self._get(booking["id"])

    async def mark_cash_paid(
        self,
        actor: dict[str, Any],
        booking_id: str,
        final_amount: Decimal | None = None,
        note: str | None = None,
        extra_amount: Decimal | None = None,
        extra_note: str | None = None,
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
        if not is_admin:
            self._ensure_provider_verified(actor)

        if booking["status"] != BookingStatus.COMPLETED.value:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Cash can be marked paid only after booking is completed.",
            )

        if booking.get("payment_status") == PaymentStatus.PAID_CASH.value:
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "Cash payment is already recorded for this booking.",
            )

        update_data = {
            "payment_status": PaymentStatus.PAID_CASH.value,
            "updated_at": datetime.now(UTC),
        }
        update_data.update(self._price_fields(booking, final_amount, extra_amount, extra_note))

        result = await self.db.bookings.update_one(
            {
                "id": booking_id,
                "status": BookingStatus.COMPLETED.value,
                "payment_status": {"$ne": PaymentStatus.PAID_CASH.value},
            },
            {"$set": update_data},
        )
        if result.modified_count != 1:
            raise self._state_changed_error(booking_id)

        await NotificationService(self.db).notify_user(
            user_id=booking["customer_id"],
            title="Cash payment recorded",
            message=(
                f"Cash payment for your {booking['category']['name']} "
                "booking has been marked paid."
            ),
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

        logger.info(
            f"Cash payment recorded for booking {booking_id} by {actor['role']} {actor['id']}"
        )
        return await self._get(booking["id"])

    @staticmethod
    def serialize(booking: dict[str, Any], actor: dict[str, Any] | None = None) -> dict:
        can_view_otp = False
        if actor:
            is_admin = actor.get("role") == UserRole.ADMIN.value
            is_customer = actor.get("role") == UserRole.CUSTOMER.value and str(
                actor.get("id")
            ) == str(booking.get("customer_id"))
            can_view_otp = is_admin or is_customer

        return {
            "id": booking["id"],
            "customer_id": booking["customer_id"],
            "customer_name": booking.get("customer", {}).get("name"),
            "provider_id": booking.get("provider_id"),
            "provider_name": booking.get("provider", {}).get("name")
            if booking.get("provider")
            else None,
            "customer_email": booking.get("customer", {}).get("email"),
            "customer_phone": booking.get("customer", {}).get("phone"),
            "category_id": booking["category_id"],
            "category_name": booking.get("category", {}).get("name"),
            "address": booking.get("address"),
            "locality": booking.get("locality"),
            "house_number": booking.get("house_number"),
            "building_name": booking.get("building_name"),
            "landmark": booking.get("landmark"),
            "pincode": booking.get("pincode"),
            "latitude": booking.get("latitude"),
            "longitude": booking.get("longitude"),
            "preferred_datetime": booking.get("preferred_datetime"),
            "issue_description": booking.get("issue_description"),
            "items": booking.get("items", []),
            "status": booking.get("status"),
            "payment_mode": booking.get("payment_mode"),
            "payment_status": booking.get("payment_status"),
            "final_amount": booking.get("final_amount"),
            "total_amount": booking.get("total_amount") or booking.get("final_amount"),
            "visit_charge": booking.get("visit_charge"),
            "extra_amount": booking.get("extra_amount"),
            "extra_note": booking.get("extra_note"),
            "offer_ends_at": booking.get("offer_ends_at"),
            "needs_admin_attention": bool(booking.get("needs_admin_attention", False)),
            "otp_locked": int(booking.get("otp_failed_attempts") or 0) >= MAX_START_OTP_ATTEMPTS,
            "otp": booking.get("otp") if can_view_otp else None,
            "created_at": booking.get("created_at"),
            "updated_at": booking.get("updated_at"),
        }

    async def _transition(
        self,
        booking: dict[str, Any],
        next_status: BookingStatus,
        actor_user_id: str,
        note: str | None,
        extra_fields: dict[str, Any] | None = None,
    ) -> None:
        previous_status = BookingStatus(booking["status"])
        now = datetime.now(UTC)
        # Compare-and-set (T1-05): only change the booking if it is still in the status we checked.
        result = await self.db.bookings.update_one(
            {"id": booking["id"], "status": previous_status.value},
            {"$set": {**(extra_fields or {}), "status": next_status.value, "updated_at": now}},
        )
        if result.modified_count != 1:
            raise self._state_changed_error(booking["id"])
        booking["status"] = next_status.value
        booking["updated_at"] = now
        await self._record_history(booking, previous_status, next_status, actor_user_id, note)
        await self._notify_booking_status_change(booking, next_status)

        logger.info(
            f"Booking {booking['id']} status changed from {previous_status.value} "
            f"to {next_status.value} by user {actor_user_id}"
        )

    @staticmethod
    def _otp_locked_error():
        return app_http_error(
            423,
            AppErrorCode.OTP_LOCKED,
            "Too many wrong start codes. Please contact GharTak support to unlock this booking.",
        )

    async def _notify_otp_locked(self, booking: dict[str, Any]) -> None:
        await NotificationService(self.db).notify_role(
            role=UserRole.ADMIN,
            title="Start code locked",
            message=(
                f"Booking #{booking['id'][:8]}: the provider entered a wrong start code "
                f"{MAX_START_OTP_ATTEMPTS} times. Reset it if the visit is genuine."
            ),
            event_type="BOOKING_OTP_LOCKED",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )

    async def reset_start_otp(self, admin: dict[str, Any], booking_id: str) -> dict[str, Any]:
        if admin.get("role") != UserRole.ADMIN.value:
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Only admins can reset a start code.")
        booking = await self._get(booking_id)
        if booking["status"] not in (BookingStatus.ACCEPTED.value, BookingStatus.ON_THE_WAY.value):
            raise app_http_error(
                422,
                AppErrorCode.BOOKING_INVALID_STATUS,
                "A start code can only be reset while the booking is waiting to start.",
            )
        await self.db.bookings.update_one(
            {"id": booking_id},
            {
                "$set": {
                    "otp": f"{secrets.randbelow(9000) + 1000}",
                    "otp_failed_attempts": 0,
                    "updated_at": datetime.now(UTC),
                }
            },
        )
        notifications = NotificationService(self.db)
        await notifications.notify_user(
            user_id=booking["customer_id"],
            title="New start code",
            message="Your booking has a new start code. Open the booking to see it.",
            event_type="BOOKING_OTP_RESET",
            related_entity_type="booking",
            related_entity_id=booking_id,
        )
        logger.info(f"Start code of booking {booking_id} reset by admin {admin['id']}.")
        return await self._get(booking_id)

    async def provider_release(
        self, provider_user: dict[str, Any], booking_id: str, note: str
    ) -> dict[str, Any]:
        """P-3: the provider gives the job back. It returns to the admin queue as REQUESTED."""
        self._ensure_provider_verified(provider_user)
        booking = await self._get(booking_id)
        if (
            not provider_user.get("provider_profile")
            or booking["provider_id"] != provider_user["id"]
        ):
            raise app_http_error(403, AppErrorCode.FORBIDDEN, "Booking is not assigned to you.")
        previous = BookingStatus(booking["status"])
        ensure_transition(Actor.PROVIDER, previous, BookingStatus.REQUESTED)

        result = await self.db.bookings.update_one(
            {"id": booking_id, "status": previous.value, "provider_id": provider_user["id"]},
            {
                "$set": {
                    "provider_id": None,
                    "status": BookingStatus.REQUESTED.value,
                    "otp_failed_attempts": 0,
                    "updated_at": datetime.now(UTC),
                }
            },
        )
        if result.modified_count != 1:
            raise self._state_changed_error(booking_id)

        await self._record_history(
            booking, previous, BookingStatus.REQUESTED, provider_user["id"], note
        )
        notifications = NotificationService(self.db)
        category_name = booking.get("category", {}).get("name", "service")
        await notifications.notify_user(
            user_id=booking["customer_id"],
            title="We are finding you a new provider",
            message=f"Your {category_name} booking is back in the queue. We will assign someone else.",
            event_type="BOOKING_RELEASED",
            related_entity_type="booking",
            related_entity_id=booking_id,
        )
        await notifications.notify_role(
            role=UserRole.ADMIN,
            title="Provider released a booking",
            message=(
                f"{provider_user.get('name', 'A provider')} released booking "
                f"#{booking_id[:8]}: {note}"
            ),
            event_type="BOOKING_RELEASED",
            related_entity_type="booking",
            related_entity_id=booking_id,
        )
        logger.info(f"Provider {provider_user['id']} released booking {booking_id}: {note}")
        return await self._get(booking_id)

    @staticmethod
    def _price_fields(
        booking: dict[str, Any],
        final_amount: Decimal | None,
        extra_amount: Decimal | None,
        extra_note: str | None,
    ) -> dict[str, Any]:
        """T1-08: final amount = visit charge + the provider's extra (never below the visit charge).

        A shipped app that still sends `final_amount` is read as visit charge + (final - visit).
        """
        visit_charge = float(booking.get("visit_charge") or 0.0)
        if extra_amount is None and final_amount is not None:
            extra_amount = max(Decimal(str(final_amount)) - Decimal(str(visit_charge)), Decimal(0))
        fields: dict[str, Any] = {}
        if extra_amount is not None:
            extra = round(float(extra_amount), 2)
            total = round(visit_charge + extra, 2)
            fields.update(extra_amount=extra, final_amount=total, total_amount=total)
        if extra_note is not None:
            fields["extra_note"] = extra_note
        return fields

    @staticmethod
    def _ensure_provider_verified(provider_user: dict[str, Any]) -> None:
        """T1-06 / P-1: only a VERIFIED provider may act on bookings."""
        profile = provider_user.get("provider_profile") or {}
        if profile.get("verification_status") != VerificationStatus.VERIFIED.value:
            raise app_http_error(
                403,
                AppErrorCode.PROVIDER_NOT_VERIFIED,
                "Your provider profile is not verified, so you cannot act on bookings.",
            )

    async def release_open_bookings(
        self, provider_id: str, reason: str, actor_user_id: str = "system"
    ) -> dict[str, int]:
        """A provider stopped being VERIFIED (reject / disable / resubmit): send their jobs back.

        REQUESTED, ACCEPTED and ON_THE_WAY bookings become unassigned REQUESTED again, with a
        history entry and notifications to the customer and the admins. IN_PROGRESS bookings stay
        with the provider and are flagged `needs_admin_attention` for an admin to resolve.
        """
        notifications = NotificationService(self.db)
        released = flagged = 0

        open_bookings = await self.db.bookings.find(
            {
                "provider_id": provider_id,
                "status": {"$in": [s.value for s in RELEASABLE_STATUSES]},
            }
        ).to_list(None)
        for booking in open_bookings:
            previous = BookingStatus(booking["status"])
            result = await self.db.bookings.update_one(
                {"id": booking["id"], "status": previous.value, "provider_id": provider_id},
                {
                    "$set": {
                        "provider_id": None,
                        "status": BookingStatus.REQUESTED.value,
                        "updated_at": datetime.now(UTC),
                    }
                },
            )
            if result.modified_count != 1:
                continue  # someone else just changed it; their change wins
            released += 1
            await self._record_history(
                booking, previous, BookingStatus.REQUESTED, actor_user_id, reason
            )
            category = (await self.db.categories.find_one({"id": booking["category_id"]})) or {}
            await notifications.notify_user(
                user_id=booking["customer_id"],
                title="We are finding you a new provider",
                message=(
                    f"Your {category.get('name', 'service')} booking is back in the queue "
                    "because the assigned provider is no longer available."
                ),
                event_type="BOOKING_RELEASED",
                related_entity_type="booking",
                related_entity_id=booking["id"],
            )
            await notifications.notify_role(
                role=UserRole.ADMIN,
                title="Booking needs a new provider",
                message=f"Booking #{booking['id'][:8]} is unassigned again: {reason}",
                event_type="BOOKING_RELEASED",
                related_entity_type="booking",
                related_entity_id=booking["id"],
            )

        in_progress = await self.db.bookings.find(
            {"provider_id": provider_id, "status": BookingStatus.IN_PROGRESS.value}
        ).to_list(None)
        for booking in in_progress:
            await self.db.bookings.update_one(
                {"id": booking["id"]},
                {"$set": {"needs_admin_attention": True, "updated_at": datetime.now(UTC)}},
            )
            flagged += 1
            await notifications.notify_role(
                role=UserRole.ADMIN,
                title="In-progress booking needs attention",
                message=(
                    f"Booking #{booking['id'][:8]} is in progress but its provider is "
                    f"no longer verified: {reason}"
                ),
                event_type="BOOKING_NEEDS_ATTENTION",
                related_entity_type="booking",
                related_entity_id=booking["id"],
            )

        if released or flagged:
            logger.info(
                f"Provider {provider_id}: {released} booking(s) returned to the queue, "
                f"{flagged} in-progress booking(s) flagged ({reason})."
            )
        return {"released": released, "flagged": flagged}

    @staticmethod
    def _state_changed_error(booking_id: str):
        logger.warning(f"Booking {booking_id} changed while another update was being applied.")
        return app_http_error(
            409,
            AppErrorCode.BOOKING_STATE_CHANGED,
            "This booking was just updated by someone else. Please refresh and try again.",
        )

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
            {"id": booking["id"]}, {"$push": {"status_history": history_entry}}
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
        status_label = next_status.value.replace("_", " ").title()
        provider_name = booking.get("provider", {}).get("name") or "Provider"
        cat_name = booking.get("category", {}).get("name") or "Service"
        await notification_service.notify_role(
            role=UserRole.ADMIN,
            title=f"Booking Status: {status_label}",
            message=(
                f"Booking #{booking['id'][:8]} ({cat_name}) updated to "
                f"{next_status.value} by {provider_name}."
            ),
            event_type="BOOKING_STATUS_CHANGED",
            related_entity_type="booking",
            related_entity_id=booking["id"],
        )

    async def _get_public_provider(self, provider_id: str) -> dict[str, Any]:
        provider = await self.db.users.find_one(
            {
                "id": provider_id,
                "role": UserRole.PROVIDER.value,
                "is_active": True,
                "provider_profile.verification_status": VerificationStatus.VERIFIED.value,
                "provider_profile.is_public": True,
            }
        )
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
