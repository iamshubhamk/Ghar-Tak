import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

VERIFY_URL = "/api/v1/auth/password-reset/verify"
RESET_URL = "/api/v1/auth/password-reset"
IDENTITY = {"email": "victim@example.com", "phone": "9876543210"}
RESET_PAYLOAD = {**IDENTITY, "new_password": "attacker-pass-1"}


@pytest.fixture
def flag_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "password_reset_self_service_enabled", False)


@pytest.fixture
def flag_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "password_reset_self_service_enabled", True)


@pytest.fixture
def bare_client() -> TestClient:
    # No lifespan and no DB override: with the flag off these requests must never touch MongoDB.
    return TestClient(app)


def test_flag_defaults_to_off() -> None:
    assert get_settings().password_reset_self_service_enabled is False


@pytest.mark.parametrize(
    ("url", "payload"),
    [
        (VERIFY_URL, IDENTITY),
        (RESET_URL, RESET_PAYLOAD),
        (VERIFY_URL, {"email": "not-an-email"}),
        (RESET_URL, {}),
    ],
)
def test_reset_endpoints_return_403_when_disabled(
    bare_client: TestClient, flag_off: None, url: str, payload: dict
) -> None:
    response = bare_client.post(url, json=payload)

    assert response.status_code == 403
    error = response.json()["detail"]["error"]
    assert error["code"] == "PASSWORD_RESET_DISABLED"
    assert error["message"] == (
        "Password reset is not available in the app yet. Please contact GharTak support."
    )


def test_disabled_response_is_identical_for_known_and_unknown_accounts(
    client: TestClient, flag_off: None
) -> None:
    client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Victim",
            "email": IDENTITY["email"],
            "phone": IDENTITY["phone"],
            "password": "original-pass-1",
        },
    )
    known = client.post(VERIFY_URL, json=IDENTITY)
    unknown = client.post(VERIFY_URL, json={"email": "nobody@example.com", "phone": "9000000000"})

    assert known.status_code == unknown.status_code == 403
    assert known.json() == unknown.json()


def test_password_unchanged_after_blocked_reset(client: TestClient, flag_off: None) -> None:
    client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Victim",
            "email": IDENTITY["email"],
            "phone": IDENTITY["phone"],
            "password": "original-pass-1",
        },
    )

    blocked = client.post(RESET_URL, json=RESET_PAYLOAD)
    old_login = client.post(
        "/api/v1/auth/login", json={"email": IDENTITY["email"], "password": "original-pass-1"}
    )
    attacker_login = client.post(
        "/api/v1/auth/login", json={"email": IDENTITY["email"], "password": "attacker-pass-1"}
    )

    assert blocked.status_code == 403
    assert old_login.status_code == 200
    assert attacker_login.status_code == 401


def test_reset_still_works_when_enabled(client: TestClient, flag_on: None) -> None:
    client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Victim",
            "email": IDENTITY["email"],
            "phone": IDENTITY["phone"],
            "password": "original-pass-1",
        },
    )

    verify = client.post(VERIFY_URL, json=IDENTITY)
    reset = client.post(RESET_URL, json=RESET_PAYLOAD)
    login = client.post(
        "/api/v1/auth/login", json={"email": IDENTITY["email"], "password": "attacker-pass-1"}
    )

    assert verify.status_code == 200
    assert reset.status_code == 200
    assert login.status_code == 200
