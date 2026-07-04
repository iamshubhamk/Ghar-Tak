import asyncio
import os
import sys
import uuid
from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings
from app.core.enums import UserRole
from app.core.security import hash_password, verify_password

async def main() -> None:
    print("Starting admin seed...", flush=True)
    settings = get_settings()
    print("Database configured", flush=True)

    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client.get_default_database()

    admin_name = os.getenv("ADMIN_NAME", "GharTak Admin").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@ghartak.local").strip().lower()
    admin_phone = os.getenv("ADMIN_PHONE") or None
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe@123")

    existing_admin = await db.users.find_one({"email": admin_email})

    if existing_admin:
        update_data = {
            "name": admin_name,
            "phone": admin_phone,
            "password_hash": hash_password(admin_password),
            "role": UserRole.ADMIN.value,
            "is_active": True,
            "updated_at": datetime.now(UTC)
        }
        await db.users.update_one({"id": existing_admin["id"]}, {"$set": update_data})
        if not verify_password(admin_password, update_data["password_hash"]):
            raise RuntimeError("Admin password verification failed after update.")
        print(f"Admin updated: {admin_email}", flush=True)
        print("Admin seed completed successfully.", flush=True)
        return

    admin_id = str(uuid.uuid4())
    now = datetime.now(UTC)
    admin_doc = {
        "id": admin_id,
        "name": admin_name,
        "email": admin_email,
        "phone": admin_phone,
        "password_hash": hash_password(admin_password),
        "role": UserRole.ADMIN.value,
        "is_active": True,
        "customer_profile": None,
        "provider_profile": None,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.users.insert_one(admin_doc)
    if not verify_password(admin_password, admin_doc["password_hash"]):
        raise RuntimeError("Admin password verification failed after create.")
    print(f"Admin created: {admin_email}", flush=True)
    print("Admin seed completed successfully.", flush=True)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Admin seed failed: {exc}", file=sys.stderr, flush=True)
        raise
