from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin import AdminCustomerResponse, AdminDashboardSummary
from app.services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/summary", response_model=AdminDashboardSummary)
def dashboard_summary(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return AdminService(db).dashboard_summary()


@router.get("/customers", response_model=list[AdminCustomerResponse])
def list_customers(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    customers = AdminService(db).list_customers()
    return [AdminService.serialize_customer(customer) for customer in customers]

