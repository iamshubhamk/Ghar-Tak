import re
import uuid
from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.default_categories import DEFAULT_HINDI_NAMES, DEFAULT_SERVICE_CATEGORIES
from app.core.errors import AppErrorCode, app_http_error
from app.schemas.category import CategoryCreateRequest, CategoryStatusRequest, CategoryUpdateRequest


class CategoryService:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self.db = db

    async def list_active(self) -> list[dict[str, Any]]:
        await self.ensure_default_categories()
        cursor = self.db.categories.find({"is_active": True}).sort([("display_order", 1), ("name", 1)])
        return await cursor.to_list(length=None)

    async def list_all(self) -> list[dict[str, Any]]:
        await self.ensure_default_categories()
        cursor = self.db.categories.find({}).sort([("display_order", 1), ("name", 1)])
        return await cursor.to_list(length=None)

    async def ensure_default_categories(self) -> list[dict[str, Any]]:
        cursor = self.db.categories.find({})
        existing_categories = await cursor.to_list(length=None)
        existing_slugs = {category["slug"] for category in existing_categories}
        existing_by_slug = {category["slug"]: category for category in existing_categories}
        created_categories = []

        for display_order, category_definition in enumerate(DEFAULT_SERVICE_CATEGORIES, start=1):
            slug = self._normalize_slug(category_definition["name"])
            if slug in existing_slugs:
                await self._add_missing_hindi_name(
                    existing_by_slug[slug], DEFAULT_HINDI_NAMES.get(category_definition["name"])
                )
                continue

            now = datetime.now(UTC)
            category_doc = {
                "id": str(uuid.uuid4()),
                "name": category_definition["name"],
                "names": {
                    "en": category_definition["name"],
                    "hi": DEFAULT_HINDI_NAMES.get(category_definition["name"]),
                },
                "slug": slug,
                "description": category_definition["description"],
                "icon": category_definition["icon"],
                "price_label": category_definition.get("price_label"),
                "display_order": display_order,
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            await self.db.categories.insert_one(category_doc)
            created_categories.append(category_doc)
            existing_slugs.add(slug)

        return created_categories

    async def _add_missing_hindi_name(
        self, category: dict[str, Any], hindi_name: str | None
    ) -> None:
        """Seeding an existing category adds the new `names` field and nothing else: no other field,
        not even `updated_at`, changes, and a Hindi name an admin already set is never replaced."""
        names = category.get("names") or {}
        if hindi_name is None or names.get("hi"):
            if not names and category.get("name"):
                await self.db.categories.update_one(
                    {"id": category["id"], "names": {"$exists": False}},
                    {"$set": {"names": {"en": category["name"], "hi": None}}},
                )
            return
        await self.db.categories.update_one(
            {"id": category["id"]},
            {"$set": {"names": {"en": names.get("en") or category["name"], "hi": hindi_name}}},
        )

    async def create(self, payload: CategoryCreateRequest) -> dict[str, Any]:
        slug = self._normalize_slug(payload.slug or payload.name)
        await self._ensure_unique_slug(slug)

        now = datetime.now(UTC)
        category_doc = {
            "id": str(uuid.uuid4()),
            "name": payload.name,
            "names": {"en": payload.name, "hi": payload.name_hi},
            "slug": slug,
            "description": payload.description,
            "icon": payload.icon,
            "display_order": payload.display_order,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await self.db.categories.insert_one(category_doc)
        return category_doc

    async def update(self, category_id: str, payload: CategoryUpdateRequest) -> dict[str, Any]:
        category = await self._get(category_id)
        update_data = {}

        if payload.name is not None or payload.name_hi is not None:
            current = category.get("names") or {"en": category["name"], "hi": None}
            update_data["names"] = {
                "en": payload.name if payload.name is not None else current.get("en"),
                "hi": payload.name_hi if payload.name_hi is not None else current.get("hi"),
            }
        if payload.name is not None:
            update_data["name"] = payload.name
        if payload.slug is not None:
            slug = self._normalize_slug(payload.slug)
            await self._ensure_unique_slug(slug, exclude_id=category["id"])
            update_data["slug"] = slug
        if payload.description is not None:
            update_data["description"] = payload.description
        if payload.icon is not None:
            update_data["icon"] = payload.icon
        if payload.display_order is not None:
            update_data["display_order"] = payload.display_order

        if update_data:
            await self.db.categories.update_one({"id": category_id}, {"$set": update_data})
            category.update(update_data)

        return category

    async def update_status(self, category_id: str, payload: CategoryStatusRequest) -> dict[str, Any]:
        category = await self._get(category_id)
        await self.db.categories.update_one({"id": category_id}, {"$set": {"is_active": payload.is_active}})
        category["is_active"] = payload.is_active
        return category

    async def _get(self, category_id: str) -> dict[str, Any]:
        category = await self.db.categories.find_one({"id": category_id})
        if not category:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Category not found.")
        return category

    async def _ensure_unique_slug(self, slug: str, exclude_id: str | None = None) -> None:
        existing = await self.db.categories.find_one({"slug": slug})
        if existing and existing["id"] != exclude_id:
            raise app_http_error(
                409,
                AppErrorCode.VALIDATION_ERROR,
                "A category with this slug already exists.",
            )

    @staticmethod
    def _normalize_slug(value: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        if not slug:
            raise app_http_error(422, AppErrorCode.VALIDATION_ERROR, "Category slug is required.")
        return slug
