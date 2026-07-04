from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.schemas.category import (
    CategoryCreateRequest,
    CategoryResponse,
    CategoryStatusRequest,
    CategoryUpdateRequest,
)
from app.services.categories import CategoryService

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: AsyncIOMotorDatabase = Depends(get_db)) -> list:
    return await CategoryService(db).list_active()


@router.get(
    "/admin/categories",
    response_model=list[CategoryResponse],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
async def admin_list_categories(db: AsyncIOMotorDatabase = Depends(get_db)) -> list:
    return await CategoryService(db).list_all()


@router.post("/admin/categories", response_model=CategoryResponse, status_code=201)
async def create_category(
    payload: CategoryCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
):
    return await CategoryService(db).create(payload)


@router.patch("/admin/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    payload: CategoryUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
):
    return await CategoryService(db).update(category_id, payload)


@router.patch("/admin/categories/{category_id}/status", response_model=CategoryResponse)
async def update_category_status(
    category_id: str,
    payload: CategoryStatusRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
):
    return await CategoryService(db).update_status(category_id, payload)
