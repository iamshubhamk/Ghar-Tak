from collections.abc import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

settings = get_settings()

client = AsyncIOMotorClient(settings.mongodb_url)
db = client.get_default_database()

async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    yield db
