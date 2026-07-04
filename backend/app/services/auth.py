from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.core.errors import AppErrorCode, app_http_error
from app.core.security import create_access_token, hash_password, verify_password
from app.models.catalog import Category, ProviderCategory, ProviderLocality
from app.models.user import CustomerProfile, ProviderProfile, User
from app.schemas.auth import (
    CustomerRegisterRequest,
    LoginRequest,
    ProviderRegisterRequest,
    TokenResponse,
)
from app.services.notifications import NotificationService


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def register_customer(self, payload: CustomerRegisterRequest) -> TokenResponse:
        self._ensure_unique_contact(email=payload.email, phone=payload.phone)

        user = User.customer(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
        )
        user.customer_profile = CustomerProfile(
            default_address=payload.default_address,
            default_locality=payload.default_locality,
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return self._token_for_user(user)

    def register_provider(self, payload: ProviderRegisterRequest) -> TokenResponse:
        self._ensure_unique_contact(email=payload.email, phone=payload.phone)

        user = User.provider(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
        )
        user.provider_profile = ProviderProfile(
            bio=payload.bio,
            experience_years=payload.experience_years,
            price_note=payload.price_note,
        )

        self.db.add(user)
        self.db.flush()
        self._attach_provider_categories(user.provider_profile, payload.category_ids)
        self._attach_provider_localities(user.provider_profile, payload.localities)
        NotificationService(self.db).notify_role(
            role=UserRole.ADMIN,
            title="Provider application received",
            message=f"{user.name} applied to join GharTak as a provider.",
            event_type="PROVIDER_APPLICATION_SUBMITTED",
            related_entity_type="provider",
            related_entity_id=user.provider_profile.id,
        )
        self.db.commit()
        self.db.refresh(user)

        return self._token_for_user(user)

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self._find_by_contact(email=payload.email, phone=payload.phone)
        if not user or not verify_password(payload.password, user.password_hash):
            raise app_http_error(
                401,
                AppErrorCode.INVALID_CREDENTIALS,
                "Invalid email/phone or password.",
            )

        if not user.is_active:
            raise app_http_error(403, AppErrorCode.ACCOUNT_DISABLED, "Account is disabled.")

        return self._token_for_user(user)

    def create_admin_user(
        self,
        *,
        name: str,
        email: str,
        password: str,
        phone: str | None = None,
    ) -> User:
        self._ensure_unique_contact(email=email, phone=phone)
        user = User.admin(
            name=name,
            email=email.lower(),
            phone=phone,
            password_hash=hash_password(password),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def _token_for_user(self, user: User) -> TokenResponse:
        token = create_access_token(subject=user.id, role=user.role)
        return TokenResponse(access_token=token, user=user)

    def _ensure_unique_contact(self, *, email: str | None, phone: str | None) -> None:
        existing_user = self._find_by_contact(email=email, phone=phone)
        if existing_user:
            raise app_http_error(
                409,
                AppErrorCode.DUPLICATE_ACCOUNT,
                "An account already exists with this email or phone.",
            )

    def _find_by_contact(self, *, email: str | None, phone: str | None) -> User | None:
        filters = []
        if email:
            filters.append(User.email == email.lower())
        if phone:
            filters.append(User.phone == phone)

        if not filters:
            return None

        statement = select(User).where(or_(*filters))
        return self.db.execute(statement).scalar_one_or_none()

    def _attach_provider_categories(
        self,
        provider_profile: ProviderProfile,
        category_ids: list[str],
    ) -> None:
        if not category_ids:
            return

        categories = self.db.execute(
            select(Category).where(Category.id.in_(category_ids), Category.is_active.is_(True))
        ).scalars()
        active_category_ids = {category.id for category in categories}

        for category_id in active_category_ids:
            provider_profile.category_links.append(ProviderCategory(category_id=category_id))

    def _attach_provider_localities(
        self,
        provider_profile: ProviderProfile,
        localities: list[str],
    ) -> None:
        for locality in localities:
            provider_profile.localities.append(ProviderLocality(locality=locality))


def role_label(role: str) -> str:
    try:
        return UserRole(role).value
    except ValueError:
        return role
