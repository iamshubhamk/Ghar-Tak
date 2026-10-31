"""T2-01: refresh tokens, rotation, reuse detection, logout, revocation (ADR 0003)."""

import json
import time
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import get_settings
from app.services.sessions import SessionService, hash_refresh_token
from tests.conftest import run

API = "/api/v1"
PASSWORD = "strongpass123"


def register(client: TestClient, email="sess@example.com", phone=None, client_header=None):
    headers = {"X-Client": client_header} if client_header else {}
    body = {"name": "Asha Devi", "email": email, "password": PASSWORD}
    if phone:
        body["phone"] = phone
    return client.post(f"{API}/auth/register/customer", json=body, headers=headers)


def login(client: TestClient, email="sess@example.com", client_header=None):
    headers = {"X-Client": client_header} if client_header else {}
    return client.post(
        f"{API}/auth/login", json={"email": email, "password": PASSWORD}, headers=headers
    )


def refresh(client: TestClient, token: str):
    return client.post(f"{API}/auth/refresh", json={"refresh_token": token})


def me(client: TestClient, access: str):
    return client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {access}"})


def error_code(response) -> str:
    return response.json()["detail"]["error"]["code"]


def record_for(db, raw: str) -> dict:
    return run(db.refresh_tokens.find_one({"token_hash": hash_refresh_token(raw)}))


# ---------- issuing ----------


@pytest.mark.parametrize("endpoint", ["register", "login"])
def test_login_and_register_return_a_refresh_token(client: TestClient, endpoint) -> None:
    register(client)
    response = register(client, "second@example.com") if endpoint == "register" else login(client)

    body = response.json()
    assert response.status_code in (200, 201)
    assert body["refresh_token"] and len(body["refresh_token"]) >= 40
    assert body["expires_in"] == get_settings().jwt_access_token_minutes * 60
    assert me(client, body["access_token"]).status_code == 200


def test_only_the_hash_of_the_refresh_token_is_stored(client: TestClient, db) -> None:
    raw = register(client).json()["refresh_token"]

    stored = run(db.refresh_tokens.find({}).to_list(10))

    assert len(stored) == 1
    assert raw not in json.dumps(stored, default=str)
    assert stored[0]["token_hash"] == hash_refresh_token(raw)


def test_lifetimes_follow_the_client_header(client: TestClient, db) -> None:
    mobile = register(client, "m@example.com", client_header="mobile").json()["refresh_token"]
    admin = register(client, "a@example.com", client_header="admin_web").json()["refresh_token"]
    default = register(client, "d@example.com").json()["refresh_token"]
    odd = register(client, "o@example.com", client_header="toaster").json()["refresh_token"]

    def days(raw, field):
        rec = record_for(db, raw)
        return (rec[field].replace(tzinfo=UTC) - rec["created_at"].replace(tzinfo=UTC)) / timedelta(
            days=1
        )

    assert round(days(mobile, "expires_at")) == 30
    assert round(days(mobile, "family_expires_at")) == 90
    for raw in (admin, default, odd):  # anything but "mobile" gets the short admin lifetime
        assert days(raw, "expires_at") == pytest.approx(0.5, abs=0.01)
        assert days(raw, "family_expires_at") == pytest.approx(0.5, abs=0.01)


# ---------- rotation ----------


def test_refresh_returns_a_new_pair_and_keeps_the_user(client: TestClient) -> None:
    first = register(client, client_header="mobile").json()

    second = refresh(client, first["refresh_token"])

    body = second.json()
    assert second.status_code == 200
    assert body["refresh_token"] != first["refresh_token"]
    assert body["user"]["email"] == "sess@example.com"
    assert body["expires_in"] == first["expires_in"]
    assert me(client, body["access_token"]).status_code == 200


def test_the_new_token_keeps_rotating(client: TestClient) -> None:
    token = register(client, client_header="mobile").json()["refresh_token"]

    for _ in range(3):
        response = refresh(client, token)
        assert response.status_code == 200
        token = response.json()["refresh_token"]


def test_reuse_after_the_grace_window_revokes_the_whole_family(client: TestClient, db) -> None:
    first = register(client, client_header="mobile").json()["refresh_token"]
    child = refresh(client, first).json()["refresh_token"]
    run(
        db.refresh_tokens.update_one(
            {"token_hash": hash_refresh_token(first)},
            {"$set": {"rotated_at": datetime.now(UTC) - timedelta(seconds=61)}},
        )
    )

    stolen_replay = refresh(client, first)
    real_client_next = refresh(client, child)

    assert stolen_replay.status_code == 401 and error_code(stolen_replay) == "AUTH_REFRESH_REUSED"
    assert real_client_next.status_code == 401  # the whole family is dead
    assert all(r["revoked_at"] for r in run(db.refresh_tokens.find({}).to_list(10)))


def test_retry_inside_the_grace_window_gets_a_fresh_pair(client: TestClient, db) -> None:
    first = register(client, client_header="mobile").json()["refresh_token"]
    lost_reply = refresh(client, first).json()["refresh_token"]  # the phone never saw this

    retry = refresh(client, first)  # 3G retry with the same token

    assert retry.status_code == 200
    newest = retry.json()["refresh_token"]
    assert newest not in (first, lost_reply)
    assert refresh(client, newest).status_code == 200  # the newest pair works
    # only the newest pair works: the child issued the first time was cancelled
    assert record_for(db, lost_reply)["revoke_reason"] == "grace_retry"


def test_grace_can_be_turned_off_with_a_setting(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "refresh_grace_seconds", 0)
    first = register(client, client_header="mobile").json()["refresh_token"]
    refresh(client, first)
    time.sleep(0.05)

    assert error_code(refresh(client, first)) == "AUTH_REFRESH_REUSED"


def test_two_parallel_refreshes_leave_exactly_one_working_pair(client: TestClient, db) -> None:
    import asyncio

    raw = register(client, client_header="mobile").json()["refresh_token"]

    async def both():
        service = SessionService(db)
        return await asyncio.gather(service.refresh(raw), service.refresh(raw))

    pairs = run(both())

    live = [p.refresh_token for p in pairs if not record_for(db, p.refresh_token)["revoked_at"]]
    assert len(pairs) == 2 and len(live) == 1
    assert refresh(client, live[0]).status_code == 200


# ---------- failures ----------


def test_unknown_token_is_rejected(client: TestClient) -> None:
    response = refresh(client, "x" * 43)

    assert response.status_code == 401 and error_code(response) == "AUTH_REFRESH_INVALID"


@pytest.mark.parametrize("field", ["expires_at", "family_expires_at"])
def test_expired_tokens_are_rejected_without_revoking(client: TestClient, db, field) -> None:
    raw = register(client, client_header="mobile").json()["refresh_token"]
    run(
        db.refresh_tokens.update_one(
            {"token_hash": hash_refresh_token(raw)},
            {"$set": {field: datetime.now(UTC) - timedelta(seconds=1)}},
        )
    )

    response = refresh(client, raw)

    # A past family end is also removed by the TTL index (at once on mongomock, within a minute
    # on real MongoDB); until then it is "expired", afterwards it is simply unknown.
    allowed = {"AUTH_REFRESH_EXPIRED"}
    if field == "family_expires_at":
        allowed.add("AUTH_REFRESH_INVALID")
    assert response.status_code == 401 and error_code(response) in allowed


def test_refresh_never_goes_past_the_end_of_the_family(client: TestClient, db) -> None:
    raw = register(client, client_header="mobile").json()["refresh_token"]
    record = record_for(db, raw)
    soon = datetime.now(UTC) + timedelta(days=2)
    run(
        db.refresh_tokens.update_many(
            {"family_id": record["family_id"]}, {"$set": {"family_expires_at": soon}}
        )
    )

    child = refresh(client, raw).json()["refresh_token"]

    assert record_for(db, child)["expires_at"].replace(tzinfo=UTC) <= soon + timedelta(seconds=1)


def test_admin_web_tokens_do_not_slide(client: TestClient, db) -> None:
    raw = register(client, client_header="admin_web").json()["refresh_token"]
    family_end = record_for(db, raw)["family_expires_at"]

    child = refresh(client, raw).json()["refresh_token"]

    assert record_for(db, child)["expires_at"] == family_end


def test_a_disabled_account_cannot_refresh(client: TestClient, db) -> None:
    raw = register(client).json()["refresh_token"]
    run(db.users.update_one({"email": "sess@example.com"}, {"$set": {"is_active": False}}))

    response = refresh(client, raw)

    assert response.status_code == 403 and error_code(response) == "ACCOUNT_DISABLED"
    assert record_for(db, raw)["revoked_at"] is not None


# ---------- logout ----------


def test_logout_ends_the_session_and_removes_the_push_token(client: TestClient, db) -> None:
    body = register(client, client_header="mobile").json()
    run(db.users.update_one({"email": "sess@example.com"}, {"$set": {"push_tokens": ["t1", "t2"]}}))

    response = client.post(
        f"{API}/auth/logout",
        json={"refresh_token": body["refresh_token"], "push_token": "t1"},
    )

    assert response.status_code == 204 and response.content == b""
    assert refresh(client, body["refresh_token"]).status_code == 401
    assert run(db.users.find_one({"email": "sess@example.com"}))["push_tokens"] == ["t2"]


def test_logout_of_a_session_also_kills_the_rotated_children(client: TestClient) -> None:
    first = register(client, client_header="mobile").json()["refresh_token"]
    newest = refresh(client, first).json()["refresh_token"]

    client.post(f"{API}/auth/logout", json={"refresh_token": newest})

    assert refresh(client, newest).status_code == 401


@pytest.mark.parametrize(
    "body", [{"refresh_token": "nonsense-token-value"}, {}, {"refresh_token": None}]
)
def test_logout_always_answers_204(client: TestClient, body) -> None:
    assert client.post(f"{API}/auth/logout", json=body).status_code == 204


def test_logout_only_ends_that_login_not_the_other_device(client: TestClient) -> None:
    phone = register(client, client_header="mobile").json()["refresh_token"]
    other = login(client, client_header="mobile").json()["refresh_token"]

    client.post(f"{API}/auth/logout", json={"refresh_token": phone})

    assert refresh(client, phone).status_code == 401
    assert refresh(client, other).status_code == 200


# ---------- revocation on password change / disable ----------


def test_admin_disabling_a_provider_ends_their_sessions(client: TestClient, admin_token) -> None:
    body = client.post(
        f"{API}/auth/register/provider",
        json={"name": "Prov", "email": "prov-sess@example.com", "password": PASSWORD},
        headers={"X-Client": "mobile"},
    ).json()
    provider_id = body["user"]["id"]

    client.patch(
        f"{API}/admin/providers/{provider_id}/disable",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )

    assert refresh(client, body["refresh_token"]).status_code in (401, 403)
    assert me(client, body["access_token"]).status_code == 403


# ---------- access token format ----------


def test_access_tokens_carry_type_issue_time_and_id(client: TestClient) -> None:
    access = register(client).json()["access_token"]

    claims = jwt.get_unverified_claims(access)

    assert claims["typ"] == "access" and claims["jti"] and claims["iat"]
    assert claims["exp"] - claims["iat"] == get_settings().jwt_access_token_minutes * 60


def test_old_tokens_without_a_type_still_work_until_they_expire(client: TestClient) -> None:
    user = register(client).json()["user"]
    settings = get_settings()
    legacy = jwt.encode(
        {"sub": user["id"], "role": "CUSTOMER", "exp": datetime.now(UTC) + timedelta(minutes=5)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    assert me(client, legacy).status_code == 200


def test_a_token_of_another_type_is_not_accepted_as_access(client: TestClient) -> None:
    user = register(client).json()["user"]
    settings = get_settings()
    other = jwt.encode(
        {
            "sub": user["id"],
            "role": "CUSTOMER",
            "typ": "refresh",
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    assert me(client, other).status_code == 401


def test_the_refresh_token_is_not_a_usable_access_token(client: TestClient) -> None:
    body = register(client).json()

    assert me(client, body["refresh_token"]).status_code == 401


def test_refresh_token_collection_is_indexed(db) -> None:
    info = run(db.refresh_tokens.index_information())

    unique = [i for i in info.values() if i["key"] == [("token_hash", 1)]]
    assert unique and unique[0].get("unique")
    assert any(i["key"] == [("user_id", 1)] for i in info.values())
