"""T2-03: rate limits on login, refresh and password reset (ADR 0003 §9)."""

import pytest
from fastapi.testclient import TestClient

from app.core import rate_limit
from app.core.config import get_settings
from app.core.rate_limit import POLICIES, Policy, RateLimiter

API = "/api/v1"
PASSWORD = "strongpass123"


@pytest.fixture
def tight(monkeypatch: pytest.MonkeyPatch):
    """Small limits so a test can hit them quickly."""
    monkeypatch.setitem(POLICIES, "login_ip", Policy(5, 60))
    monkeypatch.setitem(POLICIES, "login_account_ip_failures", Policy(3, 900))
    monkeypatch.setitem(POLICIES, "login_account_failures", Policy(5, 3600))
    monkeypatch.setitem(POLICIES, "refresh_ip", Policy(3, 60))
    monkeypatch.setitem(POLICIES, "reset_ip", Policy(2, 600))


def register(client: TestClient, phone="9876543210", email="rl@example.com"):
    return client.post(
        f"{API}/auth/register/customer",
        json={"name": "Asha Devi", "phone": phone, "email": email, "password": PASSWORD},
    )


def login(client: TestClient, password=PASSWORD, ip=None, **who):
    headers = {"X-Forwarded-For": ip} if ip else {}
    return client.post(f"{API}/auth/login", json={"password": password, **who}, headers=headers)


def code(response) -> str:
    return response.json()["detail"]["error"]["code"]


# ---------- the limiter itself ----------


def test_limiter_allows_up_to_the_limit_then_waits_for_the_window() -> None:
    now = [100.0]
    limiter = RateLimiter(clock=lambda: now[0])
    policy = Policy(3, 60)

    for _ in range(3):
        assert limiter.retry_after("k", policy) == 0
        limiter.record("k", policy)
    blocked = limiter.retry_after("k", policy)
    now[0] += 59
    still = limiter.retry_after("k", policy)
    now[0] += 2
    free = limiter.retry_after("k", policy)

    assert 0 < blocked <= 61 and 0 < still <= 3 and free == 0


def test_limiter_keys_are_independent_and_can_be_cleared() -> None:
    limiter = RateLimiter()
    policy = Policy(1, 60)
    limiter.record("a", policy)

    assert limiter.retry_after("a", policy) > 0 and limiter.retry_after("b", policy) == 0
    limiter.clear("a")
    assert limiter.retry_after("a", policy) == 0


def test_limiter_memory_is_bounded(monkeypatch) -> None:
    monkeypatch.setattr(rate_limit, "MAX_TRACKED_KEYS", 10)
    limiter = RateLimiter()

    for index in range(50):
        limiter.record(f"key{index}", Policy(5, 60))

    assert len(limiter._events) <= 10


# ---------- login ----------


def test_wrong_passwords_lock_that_account_from_that_ip(client: TestClient, tight) -> None:
    register(client)

    attempts = [login(client, "wrong-password", phone="9876543210") for _ in range(3)]
    locked = login(client, "wrong-password", phone="9876543210")
    even_the_right_password = login(client, PASSWORD, phone="9876543210")

    assert [a.status_code for a in attempts] == [401, 401, 401]
    assert locked.status_code == 429 and code(locked) == "RATE_LIMITED"
    assert even_the_right_password.status_code == 429


def test_the_429_tells_the_client_how_long_to_wait(client: TestClient, tight) -> None:
    register(client)
    for _ in range(3):
        login(client, "wrong-password", phone="9876543210")

    response = login(client, "wrong-password", phone="9876543210")

    seconds = int(response.headers["retry-after"])
    assert 0 < seconds <= 901
    assert response.json()["detail"]["error"]["details"]["retry_after_seconds"] == seconds
    assert str(seconds) in response.json()["detail"]["error"]["message"]


def test_another_account_from_the_same_ip_is_not_affected(client: TestClient, tight) -> None:
    register(client)
    register(client, phone="9876500002", email="other@example.com")
    for _ in range(3):
        login(client, "wrong-password", phone="9876543210")

    other = login(client, PASSWORD, phone="9876500002")

    assert other.status_code == 200


def test_the_real_owner_on_another_ip_can_still_log_in(client: TestClient, tight) -> None:
    register(client)
    for _ in range(3):  # an attacker at 1.1.1.1 locks the pair (account, 1.1.1.1)
        login(client, "wrong-password", phone="9876543210", ip="203.0.113.50, 1.1.1.1")

    owner = login(client, PASSWORD, phone="9876543210", ip="203.0.113.50, 2.2.2.2")

    assert owner.status_code == 200


def test_many_attackers_cannot_get_unlimited_tries_on_one_account(
    client: TestClient, tight
) -> None:
    register(client)
    for number in range(5):  # five different IPs, one failure each: the account-wide cap is 5
        login(client, "wrong-password", phone="9876543210", ip=f"203.0.113.50, 9.9.9.{number}")

    sixth = login(client, PASSWORD, phone="9876543210", ip="203.0.113.50, 9.9.9.99")

    assert sixth.status_code == 429


def test_a_successful_login_clears_that_ips_failures(client: TestClient, tight) -> None:
    register(client)
    for _ in range(2):
        login(client, "wrong-password", phone="9876543210")
    assert login(client, PASSWORD, phone="9876543210").status_code == 200

    again = [login(client, "wrong-password", phone="9876543210") for _ in range(2)]

    assert [a.status_code for a in again] == [401, 401]  # the counter started over


def test_login_per_ip_limit_applies_to_everything_from_one_address(
    client: TestClient, tight
) -> None:
    results = [login(client, "x", email=f"nobody{n}@example.com").status_code for n in range(7)]

    assert results[:5] == [401] * 5 and results[5:] == [429, 429]


def test_unknown_accounts_are_limited_too_without_revealing_that_they_do_not_exist(
    client: TestClient, tight
) -> None:
    for _ in range(3):
        login(client, "x", email="ghost@example.com")

    locked = login(client, "x", email="ghost@example.com")

    assert locked.status_code == 429  # same answer as for a real account


# ---------- refresh and reset ----------


def test_refresh_is_limited_per_ip(client: TestClient, tight) -> None:
    statuses = [
        client.post(f"{API}/auth/refresh", json={"refresh_token": "x" * 43}).status_code
        for _ in range(5)
    ]

    assert statuses[:3] == [401, 401, 401] and statuses[3:] == [429, 429]


def test_password_reset_is_limited_per_ip(client: TestClient, tight, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "password_reset_self_service_enabled", True)
    monkeypatch.setattr(get_settings(), "email_backend", "memory")
    body = {"email": "nobody@example.com"}

    statuses = [
        client.post(f"{API}/auth/password-reset/request", json=body).status_code for _ in range(4)
    ]

    assert statuses == [202, 202, 429, 429]


def test_a_disabled_reset_stays_a_403_and_is_not_counted(client: TestClient, tight) -> None:
    body = {"email": "nobody@example.com"}

    statuses = [
        client.post(f"{API}/auth/password-reset/request", json=body).status_code for _ in range(5)
    ]

    assert statuses == [403] * 5


# ---------- who is the caller ----------


def test_the_real_client_ip_is_the_one_the_proxy_appended(client: TestClient, tight) -> None:
    # Render appends the real address last. A forged first entry must not buy a fresh allowance.
    for forged in range(5):
        login(client, "x", email="a@example.com", ip=f"6.6.6.{forged}, 10.0.0.7")

    sixth = login(client, "x", email="b@example.com", ip="7.7.7.7, 10.0.0.7")

    assert sixth.status_code == 429


def test_without_a_trusted_proxy_the_header_is_ignored(
    client: TestClient, tight, monkeypatch
) -> None:
    monkeypatch.setattr(get_settings(), "trusted_proxy_count", 0)
    for forged in range(5):
        login(client, "x", email="a@example.com", ip=f"6.6.6.{forged}")

    sixth = login(client, "x", email="b@example.com", ip="7.7.7.7")

    assert sixth.status_code == 429  # all of these came from the test client's own address


def test_limits_can_be_switched_off(client: TestClient, tight, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "rate_limit_enabled", False)

    statuses = {login(client, "x", email="a@example.com").status_code for _ in range(10)}

    assert statuses == {401}
