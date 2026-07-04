from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.categories import router as categories_router
from app.api.v1.customers import router as customers_router
from app.api.v1.health import router as health_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.providers import router as providers_router
from app.api.v1.reviews import router as reviews_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(admin_router)
api_router.include_router(auth_router)
api_router.include_router(bookings_router)
api_router.include_router(categories_router)
api_router.include_router(customers_router)
api_router.include_router(health_router)
api_router.include_router(notifications_router)
api_router.include_router(providers_router)
api_router.include_router(reviews_router)
