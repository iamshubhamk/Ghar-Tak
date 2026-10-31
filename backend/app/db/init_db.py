import logging
from typing import Any

import pymongo
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase

logger = logging.getLogger("ghartak.db")

# Unique contact indexes (SU-016). They only index real string values, so any number of accounts
# may have no email or no phone (an explicit null is not indexed). The names are new on purpose:
# older databases hold sparse unique indexes called `email_1` / `phone_1`, and MongoDB refuses to
# create an index under an existing name with different options.
CONTACT_INDEXES = {
    "email": "users_email_unique_string",
    "phone": "users_phone_unique_string",
}
OLD_CONTACT_INDEX_NAMES = {"email": "email_1", "phone": "phone_1"}


def contact_index_options(field: str) -> dict[str, Any]:
    return {
        "name": CONTACT_INDEXES[field],
        "unique": True,
        "partialFilterExpression": {field: {"$type": "string"}},
    }


def is_old_contact_index(field: str, info: dict[str, Any]) -> bool:
    """The pre-SU-016 index: unique + sparse on the field, with no partial filter."""
    return (
        info.get("key") == [(field, 1)]
        and bool(info.get("unique"))
        and "partialFilterExpression" not in info
    )


def is_expected_contact_index(field: str, info: dict[str, Any]) -> bool:
    """The replacement index, exactly as `contact_index_options` defines it."""
    return (
        info.get("key") == [(field, 1)]
        and bool(info.get("unique"))
        and info.get("partialFilterExpression") == {field: {"$type": "string"}}
    )


async def _ensure_index(
    collection: AsyncIOMotorCollection, keys: list[tuple[str, int]], **options: Any
) -> None:
    """Create an index; on any failure log a warning and carry on. Never crashes startup."""
    try:
        await collection.create_index(keys, **options)
    except Exception as error:  # noqa: BLE001 - startup must survive an index mismatch
        logger.warning(
            f"Could not create index {options.get('name') or keys} on "
            f"{collection.name}: {error}. Continuing; nothing was dropped."
        )


async def _warn_about_old_contact_indexes(db: AsyncIOMotorDatabase) -> None:
    try:
        indexes = await db.users.index_information()
    except Exception as error:  # noqa: BLE001
        logger.warning(f"Could not read the users indexes: {error}")
        return
    for field, name in OLD_CONTACT_INDEX_NAMES.items():
        info = indexes.get(name)
        if info and is_old_contact_index(field, info):
            logger.warning(
                f"Old unique index '{name}' on users.{field} is still present, so a second "
                f"account without {field} will fail. "
                "Run `python -m scripts.migrate_contact_indexes` (dry run first) to replace it. "
                "Nothing was changed at startup."
            )


async def create_database_tables(db: AsyncIOMotorDatabase) -> None:
    logger.info("Setting up MongoDB indexes...")
    for field in CONTACT_INDEXES:
        await _ensure_index(db.users, [(field, pymongo.ASCENDING)], **contact_index_options(field))
    await _warn_about_old_contact_indexes(db)
    await _ensure_index(db.users, [("role", pymongo.ASCENDING)])

    await _ensure_index(db.categories, [("name", pymongo.ASCENDING)], unique=True)
    await _ensure_index(db.bookings, [("customer_id", pymongo.ASCENDING)])
    await _ensure_index(db.bookings, [("provider_id", pymongo.ASCENDING)])
    await _ensure_index(db.bookings, [("status", pymongo.ASCENDING)])

    await _ensure_index(db.notifications, [("user_id", pymongo.ASCENDING)])
    await _ensure_index(db.reviews, [("booking_id", pymongo.ASCENDING)], unique=True)
    await _ensure_index(db.reviews, [("provider_id", pymongo.ASCENDING)])

    logger.info("MongoDB setup complete.")
