import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.default_categories import DEFAULT_SERVICE_CATEGORIES
from app.core.errors import AppErrorCode, app_http_error
from app.models.catalog import Category
from app.schemas.category import CategoryCreateRequest, CategoryStatusRequest, CategoryUpdateRequest


class CategoryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_active(self) -> list[Category]:
        self.ensure_default_categories()
        statement = (
            select(Category)
            .where(Category.is_active.is_(True))
            .order_by(Category.display_order.asc(), Category.name.asc())
        )
        return list(self.db.execute(statement).scalars())

    def list_all(self) -> list[Category]:
        self.ensure_default_categories()
        statement = select(Category).order_by(Category.display_order.asc(), Category.name.asc())
        return list(self.db.execute(statement).scalars())

    def ensure_default_categories(self) -> list[Category]:
        existing_categories = list(self.db.execute(select(Category)).scalars())
        existing_slugs = {category.slug for category in existing_categories}
        created_categories: list[Category] = []

        for display_order, category_definition in enumerate(DEFAULT_SERVICE_CATEGORIES, start=1):
            slug = self._normalize_slug(category_definition["name"])
            if slug in existing_slugs:
                continue

            category = Category(
                name=category_definition["name"],
                slug=slug,
                description=category_definition["description"],
                icon=category_definition["icon"],
                display_order=display_order,
            )
            self.db.add(category)
            created_categories.append(category)
            existing_slugs.add(slug)

        if created_categories:
            self.db.commit()
            for category in created_categories:
                self.db.refresh(category)

        return created_categories

    def create(self, payload: CategoryCreateRequest) -> Category:
        slug = self._normalize_slug(payload.slug or payload.name)
        self._ensure_unique_slug(slug)

        category = Category(
            name=payload.name,
            slug=slug,
            description=payload.description,
            icon=payload.icon,
            display_order=payload.display_order,
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return category

    def update(self, category_id: str, payload: CategoryUpdateRequest) -> Category:
        category = self._get(category_id)

        if payload.name is not None:
            category.name = payload.name
        if payload.slug is not None:
            slug = self._normalize_slug(payload.slug)
            self._ensure_unique_slug(slug, exclude_id=category.id)
            category.slug = slug
        if payload.description is not None:
            category.description = payload.description
        if payload.icon is not None:
            category.icon = payload.icon
        if payload.display_order is not None:
            category.display_order = payload.display_order

        self.db.commit()
        self.db.refresh(category)
        return category

    def update_status(self, category_id: str, payload: CategoryStatusRequest) -> Category:
        category = self._get(category_id)
        category.is_active = payload.is_active
        self.db.commit()
        self.db.refresh(category)
        return category

    def _get(self, category_id: str) -> Category:
        category = self.db.get(Category, category_id)
        if not category:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Category not found.")
        return category

    def _ensure_unique_slug(self, slug: str, exclude_id: str | None = None) -> None:
        statement = select(Category).where(Category.slug == slug)
        existing = self.db.execute(statement).scalar_one_or_none()
        if existing and existing.id != exclude_id:
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
