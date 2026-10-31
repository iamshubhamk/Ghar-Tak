"""T2-05: Hindi + English category names (`names: {en, hi}`), additive."""

import re
from datetime import datetime

from fastapi.testclient import TestClient

from app.core.default_categories import DEFAULT_HINDI_NAMES, DEFAULT_SERVICE_CATEGORIES
from app.services.categories import CategoryService
from tests.conftest import run

API = "/api/v1"
DEVANAGARI = re.compile(r"^[ऀ-ॿ\s]+$")


def legacy_category(db, **overrides) -> dict:
    """A category saved before T2-05: no `names` field."""
    doc = {
        "id": "legacy-cat",
        "name": "Electrician",
        "slug": "electrician",
        "description": "Old description",
        "icon": "zap",
        "price_label": "Starts at INR 199",
        "display_order": 7,
        "is_active": True,
        "created_at": datetime(2026, 1, 1),  # MongoDB hands datetimes back without a zone
        "updated_at": datetime(2026, 1, 2),
        **overrides,
    }
    run(db.categories.insert_one(dict(doc)))
    return doc


def stored(db, category_id: str) -> dict:
    doc = run(db.categories.find_one({"id": category_id}))
    doc.pop("_id", None)
    return doc


def test_every_default_category_has_a_hindi_name() -> None:
    names = {category["name"] for category in DEFAULT_SERVICE_CATEGORIES}

    assert names == set(DEFAULT_HINDI_NAMES)
    assert all(DEVANAGARI.match(hindi) for hindi in DEFAULT_HINDI_NAMES.values())


def test_the_list_returns_both_languages_and_keeps_name(client: TestClient, db) -> None:
    run(CategoryService(db).ensure_default_categories())

    categories = client.get(f"{API}/categories").json()

    by_name = {c["name"]: c for c in categories}
    assert by_name["Electrician"]["names"] == {"en": "Electrician", "hi": "इलेक्ट्रीशियन"}
    assert by_name["Carpenter"]["names"]["hi"] == "बढ़ई"
    assert by_name["AC Repair"]["names"]["hi"] == "एसी मरम्मत"
    assert by_name["House Cleaning"]["names"]["hi"] == "घर की सफ़ाई"
    assert all(c["names"]["en"] == c["name"] and c["names"]["hi"] for c in categories)


def test_seeding_an_existing_category_adds_only_the_names_field(client: TestClient, db) -> None:
    original = legacy_category(db)

    run(CategoryService(db).ensure_default_categories())

    after = stored(db, "legacy-cat")
    assert after.pop("names") == {"en": "Electrician", "hi": "इलेक्ट्रीशियन"}
    assert after == original  # not one other field changed, not even updated_at


def test_a_hindi_name_set_by_an_admin_is_never_replaced(client: TestClient, db) -> None:
    legacy_category(db, names={"en": "Electrician", "hi": "बिजली मिस्त्री"})

    run(CategoryService(db).ensure_default_categories())

    assert stored(db, "legacy-cat")["names"]["hi"] == "बिजली मिस्त्री"


def test_seeding_twice_changes_nothing_the_second_time(client: TestClient, db) -> None:
    legacy_category(db)
    run(CategoryService(db).ensure_default_categories())
    first = stored(db, "legacy-cat")

    run(CategoryService(db).ensure_default_categories())

    assert stored(db, "legacy-cat") == first


def test_old_categories_without_names_are_still_served(client: TestClient, db) -> None:
    legacy_category(db, id="custom", name="Gardener", slug="gardener")  # not a default

    run(CategoryService(db).ensure_default_categories())
    body = {c["id"]: c for c in client.get(f"{API}/categories").json()}["custom"]

    assert body["name"] == "Gardener"
    assert body["names"] == {"en": "Gardener", "hi": None}
    assert "names" not in stored(
        db, "custom"
    )  # custom categories are not rewritten; answered on the fly


def test_response_works_even_before_any_seeding(client: TestClient, db, admin_token) -> None:
    legacy_category(db, id="raw", name="Gardener", slug="gardener")

    body = client.get(f"{API}/admin/categories", headers={"Authorization": f"Bearer {admin_token}"})

    assert body.status_code == 200
    assert {c["id"]: c for c in body.json()}["raw"]["names"]["en"] == "Gardener"


def test_admin_can_create_a_category_with_a_hindi_name(client: TestClient, admin_token) -> None:
    response = client.post(
        f"{API}/admin/categories",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Gardener", "name_hi": "माली"},
    )

    assert response.status_code == 201
    assert response.json()["names"] == {"en": "Gardener", "hi": "माली"}
    assert response.json()["name"] == "Gardener"


def test_admin_can_add_or_change_the_hindi_name_later(client: TestClient, db, admin_token) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    created = client.post(
        f"{API}/admin/categories", headers=headers, json={"name": "Gardener"}
    ).json()
    assert created["names"]["hi"] is None

    added = client.patch(
        f"{API}/admin/categories/{created['id']}", headers=headers, json={"name_hi": "माली"}
    )
    renamed = client.patch(
        f"{API}/admin/categories/{created['id']}", headers=headers, json={"name": "Garden Care"}
    )

    assert added.json()["names"] == {"en": "Gardener", "hi": "माली"}
    assert renamed.json()["names"] == {"en": "Garden Care", "hi": "माली"}
    assert renamed.json()["name"] == "Garden Care"


def test_updating_other_fields_keeps_the_names(client: TestClient, db, admin_token) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    created = client.post(
        f"{API}/admin/categories", headers=headers, json={"name": "Gardener", "name_hi": "माली"}
    ).json()

    changed = client.patch(
        f"{API}/admin/categories/{created['id']}", headers=headers, json={"description": "Lawns"}
    )

    assert changed.json()["names"] == {"en": "Gardener", "hi": "माली"}
