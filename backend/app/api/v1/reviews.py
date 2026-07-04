from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.schemas.review import ReviewCreateRequest, ReviewResponse
from app.services.reviews import ReviewService

router = APIRouter(tags=["reviews"])


@router.post("/bookings/{booking_id}/review", response_model=ReviewResponse, status_code=201)
async def create_booking_review(
    booking_id: str,
    payload: ReviewCreateRequest,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    review = await ReviewService(db).create(current_user, booking_id, payload)
    return ReviewService.serialize(review)


@router.get("/providers/{provider_id}/reviews", response_model=list[ReviewResponse])
async def list_provider_reviews(provider_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    reviews = await ReviewService(db).list_for_provider(provider_id)
    return [ReviewService.serialize(review) for review in reviews]


@router.get("/admin/reviews", response_model=list[ReviewResponse])
async def admin_list_reviews(
    _: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    reviews = await ReviewService(db).list_admin()
    return [ReviewService.serialize(review) for review in reviews]


@router.patch("/admin/reviews/{review_id}/hide", response_model=ReviewResponse)
async def admin_hide_review(
    review_id: str,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    review = await ReviewService(db).hide(current_user, review_id)
    return ReviewService.serialize(review)


@router.patch("/admin/reviews/{review_id}/show", response_model=ReviewResponse)
async def admin_show_review(
    review_id: str,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    review = await ReviewService(db).show(current_user, review_id)
    return ReviewService.serialize(review)
