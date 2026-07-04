from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.enums import BookingStatus, UserRole, VerificationStatus

class AdminService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def dashboard_summary(self) -> dict:
        total_customers = await self.db.users.count_documents({"role": UserRole.CUSTOMER.value})
        total_providers = await self.db.users.count_documents({"role": UserRole.PROVIDER.value})
        
        pending_providers = await self.db.users.count_documents({
            "role": UserRole.PROVIDER.value,
            "provider_profile.verification_status": VerificationStatus.PENDING_VERIFICATION.value,
        })
        verified_providers = await self.db.users.count_documents({
            "role": UserRole.PROVIDER.value,
            "provider_profile.verification_status": VerificationStatus.VERIFIED.value,
        })
        
        total_bookings = await self.db.bookings.count_documents({})
        completed_bookings = await self.db.bookings.count_documents({
            "status": BookingStatus.COMPLETED.value
        })
        open_statuses = [
            BookingStatus.REQUESTED.value,
            BookingStatus.ACCEPTED.value,
            BookingStatus.IN_PROGRESS.value,
        ]
        open_bookings = await self.db.bookings.count_documents({"status": {"$in": open_statuses}})

        status_counts_cursor = self.db.bookings.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ])
        status_counts = []
        async for item in status_counts_cursor:
            status_counts.append({"status": item["_id"], "count": item["count"]})

        return {
            "total_customers": total_customers,
            "total_providers": total_providers,
            "pending_providers": pending_providers,
            "verified_providers": verified_providers,
            "total_bookings": total_bookings,
            "open_bookings": open_bookings,
            "completed_bookings": completed_bookings,
            "booking_status_counts": status_counts,
        }

    async def list_customers(self) -> list[dict]:
        cursor = self.db.users.find({"role": UserRole.CUSTOMER.value}).sort("created_at", -1)
        return await cursor.to_list(length=None)

    @staticmethod
    def serialize_customer(user: dict) -> dict:
        profile = user.get("customer_profile", {})
        return {
            "id": user["id"],
            "name": user["name"],
            "email": user.get("email"),
            "phone": user.get("phone"),
            "role": user["role"],
            "is_active": user.get("is_active", True),
            "default_address": profile.get("default_address"),
            "default_locality": profile.get("default_locality"),
            "created_at": user.get("created_at"),
        }

    async def search_users(self, query: str) -> list[dict]:
        import re
        query = query.strip()
        if not query:
            return []
            
        search_filter = {
            "$or": [
                {"name": {"$regex": re.escape(query), "$options": "i"}},
                {"id": query}
            ]
        }
        
        cursor = self.db.users.find(search_filter).sort("created_at", -1)
        return await cursor.to_list(length=None)
