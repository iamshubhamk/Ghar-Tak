from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import AvailabilityStatus, UserRole, VerificationStatus
from app.core.errors import AppErrorCode, app_http_error
from app.models.catalog import Category, ProviderCategory, ProviderLocality
from app.models.user import ProviderProfile, User
from app.schemas.provider import ProviderProfileUpdateRequest
from app.services.notifications import NotificationService


class ProviderService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_provider_profile_for_user(self, user: User) -> ProviderProfile:
        if user.role != UserRole.PROVIDER.value or not user.provider_profile:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Provider profile not found.")

        return self._get(user.provider_profile.id)

    def update_provider_profile(
        self,
        user: User,
        payload: ProviderProfileUpdateRequest,
    ) -> ProviderProfile:
        provider = self.get_provider_profile_for_user(user)

        if payload.bio is not None:
            provider.bio = payload.bio
        if payload.experience_years is not None:
            provider.experience_years = payload.experience_years
        if payload.price_note is not None:
            provider.price_note = payload.price_note
        if payload.category_ids is not None:
            self._replace_categories(provider, payload.category_ids)
        if payload.localities is not None:
            self._replace_localities(provider, payload.localities)

        self.db.commit()
        return self._get(provider.id)

    def update_availability(
        self,
        user: User,
        availability_status: AvailabilityStatus,
    ) -> ProviderProfile:
        provider = self.get_provider_profile_for_user(user)
        provider.availability_status = availability_status.value
        self.db.commit()
        return self._get(provider.id)

    def list_admin(
        self,
        verification_status: VerificationStatus | None = None,
    ) -> list[ProviderProfile]:
        statement = self._base_query()
        if verification_status:
            statement = statement.where(
                ProviderProfile.verification_status == verification_status.value
            )

        statement = statement.order_by(ProviderProfile.created_at.desc())
        return list(self.db.execute(statement).scalars())

    def list_public(
        self,
        category_id: str | None = None,
        locality: str | None = None,
    ) -> list[ProviderProfile]:
        statement = self._base_query().where(
            ProviderProfile.verification_status == VerificationStatus.VERIFIED.value,
            ProviderProfile.is_public.is_(True),
        )

        if category_id:
            statement = statement.join(ProviderCategory).where(
                ProviderCategory.category_id == category_id
            )

        providers = list(self.db.execute(statement).scalars().unique())

        if locality:
            normalized = locality.lower().strip()
            providers = [
                provider
                for provider in providers
                if any(item.locality.lower() == normalized for item in provider.localities)
            ]

        return [provider for provider in providers if provider.user.is_active]

    def get_public(self, provider_id: str) -> ProviderProfile:
        provider = self._get(provider_id)
        if (
            provider.verification_status != VerificationStatus.VERIFIED.value
            or not provider.is_public
            or not provider.user.is_active
        ):
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Provider not found.")
        return provider

    def approve(self, provider_id: str) -> ProviderProfile:
        provider = self._get(provider_id)
        provider.verification_status = VerificationStatus.VERIFIED.value
        provider.is_public = True
        provider.user.is_active = True
        NotificationService(self.db).notify_user(
            user_id=provider.user_id,
            title="Profile approved",
            message=(
                "Your GharTak provider profile is approved. "
                "Booking requests can now be assigned to you."
            ),
            event_type="PROVIDER_APPROVED",
            related_entity_type="provider",
            related_entity_id=provider.id,
        )
        self.db.commit()
        return self._get(provider.id)

    def reject(self, provider_id: str) -> ProviderProfile:
        provider = self._get(provider_id)
        provider.verification_status = VerificationStatus.REJECTED.value
        provider.is_public = False
        NotificationService(self.db).notify_user(
            user_id=provider.user_id,
            title="Profile needs review",
            message=(
                "Your GharTak provider profile was not approved yet. "
                "Please contact admin for next steps."
            ),
            event_type="PROVIDER_REJECTED",
            related_entity_type="provider",
            related_entity_id=provider.id,
        )
        self.db.commit()
        return self._get(provider.id)

    def disable(self, provider_id: str) -> ProviderProfile:
        provider = self._get(provider_id)
        provider.verification_status = VerificationStatus.DISABLED.value
        provider.is_public = False
        provider.availability_status = AvailabilityStatus.UNAVAILABLE.value
        provider.user.is_active = False
        NotificationService(self.db).notify_user(
            user_id=provider.user_id,
            title="Profile disabled",
            message="Your GharTak provider profile has been disabled by admin.",
            event_type="PROVIDER_DISABLED",
            related_entity_type="provider",
            related_entity_id=provider.id,
        )
        self.db.commit()
        return self._get(provider.id)

    def _get(self, provider_id: str) -> ProviderProfile:
        statement = self._base_query().where(ProviderProfile.id == provider_id)
        provider = self.db.execute(statement).scalar_one_or_none()
        if not provider:
            raise app_http_error(404, AppErrorCode.NOT_FOUND, "Provider not found.")
        return provider

    def _replace_categories(self, provider: ProviderProfile, category_ids: list[str]) -> None:
        provider.category_links.clear()
        self.db.flush()

        if not category_ids:
            return

        active_categories = self.db.execute(
            select(Category).where(Category.id.in_(category_ids), Category.is_active.is_(True))
        ).scalars()
        active_category_ids = {category.id for category in active_categories}

        for category_id in active_category_ids:
            provider.category_links.append(ProviderCategory(category_id=category_id))

    def _replace_localities(self, provider: ProviderProfile, localities: list[str]) -> None:
        provider.localities.clear()
        self.db.flush()

        for locality in localities:
            provider.localities.append(ProviderLocality(locality=locality))

    @staticmethod
    def serialize(provider: ProviderProfile) -> dict:
        return {
            "id": provider.id,
            "user_id": provider.user_id,
            "name": provider.user.name,
            "phone": provider.user.phone,
            "bio": provider.bio,
            "experience_years": provider.experience_years,
            "verification_status": provider.verification_status,
            "availability_status": provider.availability_status,
            "price_note": provider.price_note,
            "average_rating": float(provider.average_rating),
            "total_reviews": provider.total_reviews,
            "is_public": provider.is_public,
            "categories": provider.category_names,
            "localities": provider.locality_names,
            "created_at": provider.created_at,
            "updated_at": provider.updated_at,
        }

    @staticmethod
    def _base_query():
        return select(ProviderProfile).options(
            selectinload(ProviderProfile.user),
            selectinload(ProviderProfile.category_links).selectinload(ProviderCategory.category),
            selectinload(ProviderProfile.localities),
        )
