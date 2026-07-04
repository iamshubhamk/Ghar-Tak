from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.enums import UserRole
from app.db.session import get_db
from app.models.user import User
from app.schemas.review import ReviewCreateRequest, ReviewResponse
from app.services.reviews import ReviewService

router = APIRouter(tags=["reviews"])


@router.post("/bookings/{booking_id}/review", response_model=ReviewResponse, status_code=201)
def create_booking_review(
    booking_id: str,
    payload: ReviewCreateRequest,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
):
    review = ReviewService(db).create(current_user, booking_id, payload)
    return ReviewService.serialize(review)


@router.get("/providers/{provider_id}/reviews", response_model=list[ReviewResponse])
def list_provider_reviews(provider_id: str, db: Session = Depends(get_db)):
    reviews = ReviewService(db).list_for_provider(provider_id)
    return [ReviewService.serialize(review) for review in reviews]


@router.get("/admin/reviews", response_model=list[ReviewResponse])
def admin_list_reviews(
    _: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    reviews = ReviewService(db).list_admin()
    return [ReviewService.serialize(review) for review in reviews]


@router.patch("/admin/reviews/{review_id}/hide", response_model=ReviewResponse)
def admin_hide_review(
    review_id: str,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    review = ReviewService(db).hide(current_user, review_id)
    return ReviewService.serialize(review)


@router.patch("/admin/reviews/{review_id}/show", response_model=ReviewResponse)
def admin_show_review(
    review_id: str,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    review = ReviewService(db).show(current_user, review_id)
    return ReviewService.serialize(review)
