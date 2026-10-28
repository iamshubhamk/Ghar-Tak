"""Auth cases from docs/qa/test-plan.md §2.1-2.2 (T1-16).

Password reset is covered by `test_password_reset.py` (it is switched off until ADR 0003 ships).
Rate limiting and phone normalisation are open questions (test plan §6), so they have no test yet.
"""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from tests import lifecycle_support
from tests.lifecycle_support import API, PASSWORD, World, bearer, run, xfail_until

world = lifecycle_support.world  # fixture lives in the shared support module


def register(client: TestClient, **fields):
    body = {"name": "Asha Devi", "password": PASSWORD, **fields}
    return client.post(f"{API}/auth/register/customer", json=body)


# --- registration -----------------------------------------------------------------------------


@pytest.mark.parametrize("contact", [{"email": "a@example.com"}, {"phone": "9876500001"}])
def test_customer_can_register_with_email_or_phone_only(client: TestClient, contact) -> None:
    response = register(client, **contact)

    assert response.status_code == 201
    assert response.json()["user"]["role"] == "CUSTOMER"


@pytest.mark.parametrize(
    ("path", "body"),
    [
        ("/auth/register/customer", {"name": "Asha Devi", "password": PASSWORD}),
        ("/auth/login", {"password": PASSWORD}),
    ],
)
@xfail_until("SU-011")
def test_missing_email_and_phone_is_a_422_not_a_500(client: TestClient, path, body) -> None:
    # The `client` fixture re-raises server errors; this one answers like production would.
    production_like = TestClient(client.app, raise_server_exceptions=False)

    response = production_like.post(f"{API}{path}", json=body)

    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"


def test_registration_rejects_short_password(client: TestClient) -> None:
    assert register(client, email="a@example.com", password="short").status_code == 422


def test_duplicate_email_is_case_insensitive(client: TestClient) -> None:
    register(client, email="Asha@Example.com")

    response = register(client, email="asha@example.COM")

    assert response.status_code == 409
    assert response.json()["detail"]["error"]["code"] == "DUPLICATE_ACCOUNT"


def test_registration_cannot_choose_the_role(client: TestClient) -> None:
    response = register(client, email="sneaky@example.com", role="ADMIN")

    assert response.json()["user"]["role"] == "CUSTOMER"


def test_hindi_name_round_trips(client: TestClient) -> None:
    response = register(client, email="hindi@example.com", name="आशा देवी")

    assert response.json()["user"]["name"] == "आशा देवी"


def test_provider_registers_pending_hidden_and_unavailable(world: World) -> None:
    provider_id, token = world.register_provider("pending@example.com", approve=False)

    profile = world.call("GET", "/provider/me", token).json()

    assert profile["verification_status"] == "PENDING_VERIFICATION"
    assert profile["is_public"] is False
    assert profile["availability_status"] == "UNAVAILABLE"
    assert provider_id not in [p["id"] for p in world.call("GET", "/providers").json()]
    assert world.call("GET", f"/providers/{provider_id}").status_code == 404


# --- login and tokens -------------------------------------------------------------------------


@pytest.mark.parametrize("identifier", ["email", "phone"])
def test_login_with_email_or_phone(client: TestClient, identifier) -> None:
    contact = {"email": "login@example.com", "phone": "9876500002"}
    register(client, **contact)

    response = client.post(
        f"{API}/auth/login", json={identifier: contact[identifier], "password": PASSWORD}
    )

    assert response.status_code == 200
    assert response.json()["user"]["role"] == "CUSTOMER"


def test_wrong_password_and_unknown_user_look_identical(client: TestClient) -> None:
    register(client, email="known@example.com")

    wrong = client.post(
        f"{API}/auth/login", json={"email": "known@example.com", "password": "nope"}
    )
    unknown = client.post(
        f"{API}/auth/login", json={"email": "who@example.com", "password": "nope"}
    )

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_disabled_user_cannot_log_in_and_old_token_stops_working(world: World) -> None:
    token = world.customer
    world.set_user_active(world.customer_id, False)

    login = world.call(
        "POST", "/auth/login", json={"email": "lifecycle-c1@example.com", "password": PASSWORD}
    )
    me = world.call("GET", "/auth/me", token)

    assert login.status_code == 403
    assert login.json()["detail"]["error"]["code"] == "ACCOUNT_DISABLED"
    assert me.status_code == 403


def test_me_never_returns_the_password_hash(world: World) -> None:
    body = world.call("GET", "/auth/me", world.customer).json()

    assert "password_hash" not in body
    assert "password" not in body


def test_expired_token_is_rejected(world: World) -> None:
    expired = create_access_token(
        world.customer_id, "CUSTOMER", expires_delta=timedelta(seconds=-5)
    )

    assert world.call("GET", "/auth/me", expired).status_code == 401


def test_token_signed_with_another_key_is_rejected(world: World) -> None:
    from jose import jwt

    forged = jwt.encode(
        {"sub": world.customer_id, "role": "CUSTOMER"}, "other-key", algorithm="HS256"
    )

    assert world.call("GET", "/auth/me", forged).status_code == 401


def test_token_for_a_deleted_user_is_rejected(world: World) -> None:
    run(world.db.users.delete_one({"id": world.customer_id}))

    assert world.call("GET", "/auth/me", world.customer).status_code == 401


def test_garbage_and_missing_tokens_are_rejected(world: World) -> None:
    assert world.call("GET", "/auth/me").status_code == 401
    assert world.call("GET", "/auth/me", "not-a-jwt").status_code == 401
    assert (
        world.client.get(f"{API}/auth/me", headers={"Authorization": "Basic abc"}).status_code
        == 401
    )


def test_bearer_helper_is_sane() -> None:
    assert bearer(None) == {}
    assert bearer("t") == {"Authorization": "Bearer t"}
