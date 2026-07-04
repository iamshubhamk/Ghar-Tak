from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.default_categories import DEFAULT_PRICE_LABEL_BY_SLUG
from app.db.base import Base
from app.models.user import new_uuid, utc_now

if TYPE_CHECKING:
    from app.models.user import ProviderProfile


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    provider_links: Mapped[list["ProviderCategory"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
    )

    @property
    def price_label(self) -> str | None:
        return DEFAULT_PRICE_LABEL_BY_SLUG.get(self.slug)


class ProviderCategory(Base):
    __tablename__ = "provider_categories"

    provider_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("provider_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("categories.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    provider: Mapped["ProviderProfile"] = relationship(back_populates="category_links")
    category: Mapped[Category] = relationship(back_populates="provider_links")


class ProviderLocality(Base):
    __tablename__ = "provider_localities"
    __table_args__ = (
        UniqueConstraint("provider_id", "locality", name="uq_provider_locality"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    provider_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("provider_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    locality: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    provider: Mapped["ProviderProfile"] = relationship(back_populates="localities")


class ProviderDocument(Base):
    __tablename__ = "provider_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    provider_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("provider_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(80), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    provider: Mapped["ProviderProfile"] = relationship(back_populates="documents")
