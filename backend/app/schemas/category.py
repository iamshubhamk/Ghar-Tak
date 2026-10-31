from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.auth import clean_optional


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    name_hi: str | None = Field(default=None, max_length=120)
    slug: str | None = Field(default=None, max_length=140)
    description: str | None = Field(default=None, max_length=1000)
    icon: str | None = Field(default=None, max_length=80)
    display_order: int = Field(default=0, ge=0)

    @field_validator("name", "name_hi", "slug", "description", "icon", mode="before")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return clean_optional(value)


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    name_hi: str | None = Field(default=None, max_length=120)
    slug: str | None = Field(default=None, max_length=140)
    description: str | None = Field(default=None, max_length=1000)
    icon: str | None = Field(default=None, max_length=80)
    display_order: int | None = Field(default=None, ge=0)

    @field_validator("name", "name_hi", "slug", "description", "icon", mode="before")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return clean_optional(value)


class CategoryStatusRequest(BaseModel):
    is_active: bool


class CategoryNames(BaseModel):
    """The category name in each supported language. `hi` is null until a Hindi name exists."""

    en: str
    hi: str | None = None


class CategoryResponse(BaseModel):
    id: str
    name: str  # English; kept for older clients. New clients read `names`.
    names: CategoryNames
    slug: str
    description: str | None = None
    icon: str | None = None
    price_label: str | None = None
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def fill_names(cls, data):
        """Categories saved before T2-05 have no `names`; answer with the English name."""
        if isinstance(data, dict) and not data.get("names"):
            return {**data, "names": {"en": data.get("name"), "hi": None}}
        return data
