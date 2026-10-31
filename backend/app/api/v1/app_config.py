from fastapi import APIRouter, Response

from app.core.config import get_settings
from app.schemas.app_config import AppConfigResponse, AssignmentPromise

router = APIRouter(prefix="/app", tags=["app"])


@router.get("/config", response_model=AppConfigResponse, operation_id="get_app_config")
async def get_app_config(response: Response) -> AppConfigResponse:
    """Public values for the mobile app: force-update versions, support contact, visit charge,
    assignment promise and feature flags. Everything comes from settings (environment variables)."""
    settings = get_settings()
    response.headers["Cache-Control"] = "public, max-age=60"
    return AppConfigResponse(
        min_supported_version=settings.app_min_supported_version,
        latest_version=settings.app_latest_version,
        play_store_url=settings.play_store_url or None,
        support_phone=settings.support_phone or None,
        visit_charge_inr=round(float(settings.launch_visit_charge_inr), 2),
        offer_ends_at=settings.launch_offer_ends_at,
        assignment_promise=AssignmentPromise(
            minutes=settings.assignment_promise_minutes,
            window_start=settings.service_window_start,
            window_end=settings.service_window_end,
            timezone=settings.service_timezone,
        ),
        flags={
            "password_reset_enabled": settings.password_reset_self_service_enabled,
            **settings.app_flags,
        },
    )
