from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.category import (
    CategoryCreateRequest,
    CategoryResponse,
    CategoryStatusRequest,
    CategoryUpdateRequest,
)
from app.services.categories import CategoryService

router = APIRouter(tags=["categories"])


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_db)) -> list:
    return CategoryService(db).list_active()


@router.get(
    "/admin/categories",
    response_model=list[CategoryResponse],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def admin_list_categories(db: Session = Depends(get_db)) -> list:
    return CategoryService(db).list_all()


@router.post("/admin/categories", response_model=CategoryResponse, status_code=201)
def create_category(
    payload: CategoryCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    return CategoryService(db).create(payload)


@router.patch("/admin/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    payload: CategoryUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    return CategoryService(db).update(category_id, payload)


@router.patch("/admin/categories/{category_id}/status", response_model=CategoryResponse)
def update_category_status(
    category_id: str,
    payload: CategoryStatusRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN)),
):
    return CategoryService(db).update_status(category_id, payload)
