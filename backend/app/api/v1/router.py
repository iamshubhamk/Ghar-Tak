from fastapi import APIRouter
from fastapi.routing import APIRoute

from app.api.v1.admin import router as admin_router
from app.api.v1.app_config import router as app_config_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.categories import router as categories_router
from app.api.v1.customers import router as customers_router
from app.api.v1.health import router as health_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.providers import router as providers_router
from app.api.v1.reviews import router as reviews_router
from app.schemas.errors import ErrorResponse

ERROR_RESPONSES: dict[int | str, dict] = {
    400: {"model": ErrorResponse, "description": "The request cannot be done (bad value)."},
    401: {"model": ErrorResponse, "description": "Login required, or the token is invalid."},
    403: {"model": ErrorResponse, "description": "Not allowed for this account."},
    404: {"model": ErrorResponse, "description": "Not found."},
    409: {"model": ErrorResponse, "description": "Conflict (duplicate or state changed)."},
    422: {"model": ErrorResponse, "description": "Validation error (`details.errors`)."},
    429: {"model": ErrorResponse, "description": "Too many attempts (RATE_LIMITED); see Retry-After."},
}

api_router = APIRouter(prefix="/api/v1", responses=ERROR_RESPONSES)
api_router.include_router(admin_router)
api_router.include_router(app_config_router)
api_router.include_router(auth_router)
api_router.include_router(bookings_router)
api_router.include_router(categories_router)
api_router.include_router(customers_router)
api_router.include_router(health_router)
api_router.include_router(notifications_router)
api_router.include_router(providers_router)
api_router.include_router(reviews_router)



def _name_operations() -> None:
    """Stable, readable operation ids: `<tag>_<function name>` (for example `auth_login`).

    Generated clients and docs use these names, so they must not change when a path does.
    """
    for route in api_router.routes:
        if isinstance(route, APIRoute) and route.operation_id is None:
            tag = str(route.tags[0]) if route.tags else "api"
            route.operation_id = f"{tag}_{route.name}"


_name_operations()
