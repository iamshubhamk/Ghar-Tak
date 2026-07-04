import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings

async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client.get_default_database()
    result = await db.categories.delete_many({})
    print(f"Deleted {result.deleted_count} categories.")

asyncio.run(main())
