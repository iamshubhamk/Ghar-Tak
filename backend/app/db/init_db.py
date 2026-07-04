import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
import pymongo

logger = logging.getLogger("ghartak.db")

async def create_database_tables(db: AsyncIOMotorDatabase) -> None:
    logger.info("Setting up MongoDB indexes...")
    await db.users.create_index([("email", pymongo.ASCENDING)], unique=True, sparse=True)
    await db.users.create_index([("phone", pymongo.ASCENDING)], unique=True, sparse=True)
    await db.users.create_index([("role", pymongo.ASCENDING)])
    
    await db.categories.create_index([("name", pymongo.ASCENDING)], unique=True)
    await db.bookings.create_index([("customer_id", pymongo.ASCENDING)])
    await db.bookings.create_index([("provider_id", pymongo.ASCENDING)])
    await db.bookings.create_index([("status", pymongo.ASCENDING)])
    
    await db.notifications.create_index([("user_id", pymongo.ASCENDING)])
    await db.reviews.create_index([("booking_id", pymongo.ASCENDING)], unique=True)
    await db.reviews.create_index([("provider_id", pymongo.ASCENDING)])
    
    logger.info("MongoDB setup complete.")
