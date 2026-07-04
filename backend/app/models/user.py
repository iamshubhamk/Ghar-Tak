from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import AvailabilityStatus, UserRole, VerificationStatus
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.catalog import ProviderCategory, ProviderDocument, ProviderLocality


def new_uuid() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    customer_profile: Mapped["CustomerProfile | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    provider_profile: Mapped["ProviderProfile | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )

    @classmethod
    def customer(
        cls,
        *,
        name: str,
        password_hash: str,
        email: str | None,
        phone: str | None,
    ) -> "User":
        return cls(
            name=name,
            email=email,
            phone=phone,
            password_hash=password_hash,
            role=UserRole.CUSTOMER.value,
        )

    @classmethod
    def provider(
        cls,
        *,
        name: str,
        password_hash: str,
        email: str | None,
        phone: str | None,
    ) -> "User":
        return cls(
            name=name,
            email=email,
            phone=phone,
            password_hash=password_hash,
            role=UserRole.PROVIDER.value,
        )

    @classmethod
    def admin(
        cls,
        *,
        name: str,
        password_hash: str,
        email: str,
        phone: str | None = None,
    ) -> "User":
        return cls(
            name=name,
            email=email,
            phone=phone,
            password_hash=password_hash,
            role=UserRole.ADMIN.value,
        )


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    default_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_locality: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    user: Mapped[User] = relationship(back_populates="customer_profile")


class ProviderProfile(Base):
    __tablename__ = "provider_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    verification_status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default=VerificationStatus.PENDING_VERIFICATION.value,
        index=True,
    )
    availability_status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default=AvailabilityStatus.UNAVAILABLE.value,
        index=True,
    )
    price_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    average_rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, default=0)
    total_reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    user: Mapped[User] = relationship(back_populates="provider_profile")
    category_links: Mapped[list["ProviderCategory"]] = relationship(
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    localities: Mapped[list["ProviderLocality"]] = relationship(
        back_populates="provider",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list["ProviderDocument"]] = relationship(
        back_populates="provider",
        cascade="all, delete-orphan",
    )

    @property
    def category_names(self) -> list[str]:
        return [link.category.name for link in self.category_links if link.category]

    @property
    def locality_names(self) -> list[str]:
        return [locality.locality for locality in self.localities]
