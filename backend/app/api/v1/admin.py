from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.schemas.admin import AdminCustomerResponse, AdminDashboardSummary
from app.services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/summary", response_model=AdminDashboardSummary)
async def dashboard_summary(
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await AdminService(db).dashboard_summary()


from app.schemas.auth import UserResponse

@router.get("/customers", response_model=list[AdminCustomerResponse])
async def list_customers(
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    customers = await AdminService(db).list_customers()
    return [AdminService.serialize_customer(customer) for customer in customers]

@router.get("/users/search", response_model=list[UserResponse])
async def search_users(
    q: str,
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    users = await AdminService(db).search_users(q)
    return users

