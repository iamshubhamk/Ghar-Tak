import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings
from app.services.categories import CategoryService

async def main():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.database_url)
    db = client.get_default_database()
    try:
        service = CategoryService(db)
        categories = await service.list_active()
        print(f"Categories: {len(categories)}")
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
