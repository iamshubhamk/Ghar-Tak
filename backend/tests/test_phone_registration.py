"""T2-06: phone-first registration; 10-digit normalisation; login finds older stored formats (Q3).

These tests use `strict_client`, the API exactly as a real client sees it.
"""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.schemas.auth import normalize_phone_number, phone_variants
from tests.conftest import run

API = "/api/v1"
PASSWORD = "strongpass123"


def register(client: TestClient, **fields):
    body = {"name": "Asha Devi", "password": PASSWORD, **fields}
    return client.post(f"{API}/auth/register/customer", json=body)


def login(client: TestClient, **fields):
    return client.post(f"{API}/auth/login", json={"password": PASSWORD, **fields})


def insert_legacy_user(db, phone: str | None, email: str | None = None, user_id: str = "legacy-1"):
    run(
        db.users.insert_one(
            {
                "id": user_id,
                "name": "Old Account",
                "email": email,
                "phone": phone,
                "password_hash": hash_password(PASSWORD),
                "role": "CUSTOMER",
                "is_active": True,
                "customer_profile": {},
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
        )
    )


# ---------- the rule ----------


def test_phone_alone_is_enough_and_email_stays_empty(strict_client: TestClient, db) -> None:
    response = register(strict_client, phone="9876543210")

    assert response.status_code == 201
    stored = run(db.users.find_one({"phone": "9876543210"}))
    assert stored["email"] is None
    assert response.json()["user"]["phone"] == "9876543210"


def test_email_is_optional_but_kept_when_given(strict_client: TestClient, db) -> None:
    response = register(strict_client, phone="9876543210", email="Asha@Example.com")

    assert response.status_code == 201
    assert run(db.users.find_one({"phone": "9876543210"}))["email"] == "asha@example.com"


@pytest.mark.parametrize(
    "fields", [{"email": "only@example.com"}, {}, {"phone": ""}, {"phone": " "}]
)
def test_registration_without_a_phone_is_refused(strict_client: TestClient, fields) -> None:
    response = register(strict_client, **fields)

    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    "phone", ["12345", "5876543210", "abcdefghij", "98765432101", "0000000000"]
)
def test_registration_with_an_invalid_phone_is_refused(strict_client: TestClient, phone) -> None:
    response = register(strict_client, phone=phone)

    assert response.status_code == 422
    assert "mobile number" in str(response.json())


@pytest.mark.parametrize(
    "typed",
    [
        "9876543210",
        "+919876543210",
        "+91 98765 43210",
        "09876543210",
        "919876543210",
        "98765-43210",
        " 98765 43210 ",
        "(+91) 9876543210",
    ],
)
def test_phone_formats_are_stored_as_ten_digits(strict_client: TestClient, db, typed) -> None:
    response = register(strict_client, phone=typed)

    assert response.status_code == 201
    assert response.json()["user"]["phone"] == "9876543210"
    assert run(db.users.find_one({"id": response.json()["user"]["id"]}))["phone"] == "9876543210"


def test_providers_need_a_phone_too(strict_client: TestClient) -> None:
    body = {"name": "Prov", "password": PASSWORD}

    refused = strict_client.post(
        f"{API}/auth/register/provider", json={**body, "email": "p@example.com"}
    )
    accepted = strict_client.post(
        f"{API}/auth/register/provider", json={**body, "phone": "+91 98765 00001"}
    )

    assert refused.status_code == 422
    assert accepted.status_code == 201 and accepted.json()["user"]["phone"] == "9876500001"


def test_provider_form_registration_needs_a_phone_and_normalises_it(
    strict_client: TestClient,
) -> None:
    files = {"adhaar_card": ("a.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 64, "image/jpeg")}
    base = {"name": "Form Prov", "password": PASSWORD}

    refused = strict_client.post(f"{API}/auth/register/provider", data=base, files=files)
    accepted = strict_client.post(
        f"{API}/auth/register/provider", data={**base, "phone": "09876500002"}, files=files
    )

    assert refused.status_code == 422
    assert accepted.status_code == 201 and accepted.json()["user"]["phone"] == "9876500002"


def test_two_accounts_without_an_email_can_register(strict_client: TestClient) -> None:
    first = register(strict_client, phone="9876500011")
    second = register(strict_client, phone="9876500012", name="Bina Devi")

    assert first.status_code == 201 and second.status_code == 201


# ---------- duplicates across formats ----------


def test_the_same_number_in_another_format_is_a_duplicate(strict_client: TestClient) -> None:
    register(strict_client, phone="9876543210")

    again = register(strict_client, phone="+91 98765 43210", name="Other Person")

    assert again.status_code == 409
    assert again.json()["detail"]["error"]["code"] == "DUPLICATE_ACCOUNT"


@pytest.mark.parametrize(
    "legacy", ["+919876543211", "09876543211", "919876543211", "+91 9876543211"]
)
def test_a_number_stored_in_an_older_format_blocks_a_new_registration(
    strict_client: TestClient, db, legacy
) -> None:
    insert_legacy_user(db, legacy)

    response = register(strict_client, phone="9876543211")

    assert response.status_code == 409


# ---------- login (older accounts keep working, nothing is rewritten) ----------


@pytest.mark.parametrize(
    "typed", ["9876543210", "+919876543210", "+91 98765 43210", "09876543210", "98765 43210"]
)
def test_login_by_phone_in_any_format(strict_client: TestClient, typed) -> None:
    register(strict_client, phone="9876543210")

    response = login(strict_client, phone=typed)

    assert response.status_code == 200
    assert response.json()["user"]["phone"] == "9876543210"


@pytest.mark.parametrize("stored", ["+919876500777", "09876500777", "919876500777", "9876500777"])
@pytest.mark.parametrize("typed", ["9876500777", "+91 9876500777", "09876500777"])
def test_older_accounts_still_log_in_and_their_data_is_not_rewritten(
    strict_client: TestClient, db, stored, typed
) -> None:
    insert_legacy_user(db, stored, user_id=f"legacy-{stored}")

    response = login(strict_client, phone=typed)

    assert response.status_code == 200
    assert response.json()["user"]["id"] == f"legacy-{stored}"
    assert run(db.users.find_one({"id": f"legacy-{stored}"}))["phone"] == stored  # untouched


def test_login_by_email_still_works(strict_client: TestClient) -> None:
    register(strict_client, phone="9876543210", email="asha@example.com")

    assert login(strict_client, email="ASHA@example.com").status_code == 200


def test_wrong_password_or_unknown_phone_is_a_plain_401(strict_client: TestClient) -> None:
    register(strict_client, phone="9876543210")

    wrong = strict_client.post(
        f"{API}/auth/login", json={"phone": "9876543210", "password": "nope"}
    )
    unknown = login(strict_client, phone="9123456789")
    garbage = login(strict_client, phone="not a number")

    assert wrong.status_code == unknown.status_code == garbage.status_code == 401


# ---------- the helpers ----------


@pytest.mark.parametrize(
    ("typed", "expected"),
    [
        ("+91 98765 43210", "9876543210"),
        ("09876543210", "9876543210"),
        ("919876543210", "9876543210"),
        ("9198765432", "9198765432"),  # a real 10-digit number that merely starts with 91
        ("  ", None),
        (None, None),
        ("abc", "abc"),
    ],
)
def test_normalize_phone_number(typed, expected) -> None:
    assert normalize_phone_number(typed) == expected


def test_phone_variants_cover_every_stored_format_and_nothing_else() -> None:
    assert phone_variants("+91 98765 43210") == [
        "9876543210",
        "+919876543210",
        "919876543210",
        "09876543210",
        "+91 9876543210",
    ]
    assert phone_variants("not a number") == ["not a number"]
