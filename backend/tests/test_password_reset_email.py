"""T2-02: password reset with an emailed one-time code (ADR 0003 §8)."""

import re
import time
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.rate_limit import POLICIES, Policy
from app.core.security import hash_password
from app.services.email import memory_outbox
from tests.conftest import run

API = "/api/v1"
REQUEST = f"{API}/auth/password-reset/request"
CONFIRM = f"{API}/auth/password-reset/confirm"
OLD = "original-pass-1"
NEW = "brand-new-pass-1"
EMAIL = "reset@example.com"


@pytest.fixture(autouse=True)
def reset_on(monkeypatch: pytest.MonkeyPatch):
    """Self-service reset switched on, mail collected in memory."""
    settings = get_settings()
    monkeypatch.setattr(settings, "password_reset_self_service_enabled", True)
    monkeypatch.setattr(settings, "email_backend", "memory")
    memory_outbox().clear()
    yield
    memory_outbox().clear()


def register(client: TestClient, email=EMAIL, phone="9876543210"):
    body = {"name": "Asha Devi", "phone": phone, "password": OLD}
    if email:
        body["email"] = email
    return client.post(f"{API}/auth/register/customer", json=body, headers={"X-Client": "mobile"})


def ask(client: TestClient, email=EMAIL):
    return client.post(REQUEST, json={"email": email})


def last_code() -> str:
    match = re.search(r"code is (\d{6})", memory_outbox()[-1].body)
    assert match, memory_outbox()[-1].body
    return match.group(1)


def confirm(client: TestClient, code: str, password=NEW, email=EMAIL):
    return client.post(CONFIRM, json={"email": email, "code": code, "new_password": password})


def error_code(response) -> str:
    return response.json()["detail"]["error"]["code"]


def wrong_code(real: str) -> str:
    return "000000" if real != "000000" else "111111"


# ---------- asking for a code ----------


def test_a_code_is_emailed_to_a_real_account(client: TestClient) -> None:
    register(client)

    response = ask(client)

    assert response.status_code == 202
    assert len(memory_outbox()) == 1
    sent = memory_outbox()[0]
    assert sent.to == EMAIL and "GharTak" in sent.subject
    assert re.search(r"\b\d{6}\b", sent.body) and "15 minutes" in sent.body


def test_the_answer_is_identical_for_known_and_unknown_emails(client: TestClient) -> None:
    register(client)

    known = ask(client)
    unknown = ask(client, "nobody@example.com")

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert [m.to for m in memory_outbox()] == [EMAIL]  # only the real account got mail


def test_admins_never_reset_by_email(client: TestClient, admin_token) -> None:
    response = ask(client, "admin@example.com")

    assert response.status_code == 202
    assert memory_outbox() == []


def test_accounts_without_an_email_cannot_get_a_code(client: TestClient, db) -> None:
    register(client, email=None)

    assert ask(client, "nobody@example.com").status_code == 202
    assert memory_outbox() == []  # phone-only accounts reset through support


def test_disabled_accounts_get_no_code(client: TestClient, db) -> None:
    register(client)
    run(db.users.update_one({"email": EMAIL}, {"$set": {"is_active": False}}))

    assert ask(client).status_code == 202
    assert memory_outbox() == []


def test_the_code_is_stored_only_as_a_hash(client: TestClient, db) -> None:
    register(client)
    ask(client)

    stored = run(db.password_resets.find({}).to_list(10))

    assert len(stored) == 1 and last_code() not in str(stored)
    assert stored[0]["attempts"] == 0 and stored[0]["expires_at"] > datetime.now(UTC).replace(
        tzinfo=None
    )


def test_a_new_request_replaces_the_earlier_code(client: TestClient, db) -> None:
    register(client)
    ask(client)
    first = last_code()

    ask(client)
    second = last_code()

    assert run(db.password_resets.count_documents({})) == 1
    if first != second:
        assert error_code(confirm(client, first)) == "RESET_CODE_INVALID"
    assert confirm(client, second).status_code == 200


def test_only_three_codes_per_hour_per_email_and_nothing_leaks(client: TestClient) -> None:
    register(client)

    answers = [ask(client).status_code for _ in range(5)]

    assert answers == [202] * 5  # the caller cannot tell
    assert len(memory_outbox()) == 3


def test_a_failing_mail_server_does_not_change_the_answer(client: TestClient, monkeypatch) -> None:
    register(client)

    class Broken:
        async def send(self, message):
            raise RuntimeError("smtp is down")

    monkeypatch.setattr("app.services.password_reset.get_email_sender", lambda: Broken())

    assert ask(client).status_code == 202


# ---------- using the code ----------


def test_the_right_code_sets_the_password_and_logs_in(client: TestClient) -> None:
    register(client)
    ask(client)

    response = confirm(client, last_code())

    body = response.json()
    assert response.status_code == 200
    assert body["refresh_token"] and body["user"]["email"] == EMAIL
    login_new = client.post(f"{API}/auth/login", json={"email": EMAIL, "password": NEW})
    login_old = client.post(f"{API}/auth/login", json={"email": EMAIL, "password": OLD})
    assert login_new.status_code == 200 and login_old.status_code == 401


def test_a_code_works_only_once(client: TestClient) -> None:
    register(client)
    ask(client)
    code = last_code()

    first = confirm(client, code)
    second = confirm(client, code, password="another-pass-22")

    assert first.status_code == 200
    assert second.status_code == 400 and error_code(second) == "RESET_CODE_INVALID"
    assert (
        client.post(f"{API}/auth/login", json={"email": EMAIL, "password": NEW}).status_code == 200
    )


def test_a_wrong_code_is_refused_and_the_password_is_unchanged(client: TestClient) -> None:
    register(client)
    ask(client)

    response = confirm(client, wrong_code(last_code()))

    assert response.status_code == 400 and error_code(response) == "RESET_CODE_INVALID"
    assert (
        client.post(f"{API}/auth/login", json={"email": EMAIL, "password": OLD}).status_code == 200
    )


def test_five_wrong_tries_burn_the_code(client: TestClient, db) -> None:
    register(client)
    ask(client)
    real = last_code()

    for _ in range(5):
        assert confirm(client, wrong_code(real)).status_code == 400
    after = confirm(client, real)  # even the right code is gone now

    assert after.status_code == 400 and error_code(after) == "RESET_CODE_INVALID"
    assert run(db.password_resets.count_documents({})) == 0
    assert (
        client.post(f"{API}/auth/login", json={"email": EMAIL, "password": OLD}).status_code == 200
    )


def test_the_code_expires(client: TestClient, db) -> None:
    register(client)
    ask(client)
    run(
        db.password_resets.update_one(
            {}, {"$set": {"expires_at": datetime.now(UTC) - timedelta(seconds=1)}}
        )
    )

    response = confirm(client, last_code())

    assert response.status_code == 400 and error_code(response) == "RESET_CODE_INVALID"


def test_a_code_for_one_account_does_not_work_for_another(client: TestClient) -> None:
    register(client)
    register(client, email="other@example.com", phone="9876500002")
    ask(client)
    code = last_code()

    response = confirm(client, code, email="other@example.com")

    assert response.status_code == 400


def test_unknown_email_and_wrong_code_look_the_same(client: TestClient) -> None:
    register(client)
    ask(client)

    wrong = confirm(client, wrong_code(last_code()))
    unknown = confirm(client, "123456", email="nobody@example.com")

    assert wrong.json() == unknown.json()


def test_the_new_password_must_be_at_least_eight_characters(client: TestClient) -> None:
    register(client)
    ask(client)

    response = confirm(client, last_code(), password="short1")

    assert response.status_code == 422
    assert (
        client.post(f"{API}/auth/login", json={"email": EMAIL, "password": OLD}).status_code == 200
    )


@pytest.mark.parametrize("code", ["12345", "1234567", "abcdef", "12 456", ""])
def test_the_code_must_be_six_digits(client: TestClient, code) -> None:
    assert confirm(client, code).status_code == 422


def test_a_reset_ends_every_other_session(client: TestClient) -> None:
    old = register(client).json()
    time.sleep(1.1)  # access-token issue times have one-second precision
    ask(client)

    new = confirm(client, last_code()).json()

    assert (
        client.post(f"{API}/auth/refresh", json={"refresh_token": old["refresh_token"]}).status_code
        == 401
    )
    me_old = client.get(
        f"{API}/auth/me", headers={"Authorization": f"Bearer {old['access_token']}"}
    )
    me_new = client.get(
        f"{API}/auth/me", headers={"Authorization": f"Bearer {new['access_token']}"}
    )
    assert me_old.status_code == 401 and me_new.status_code == 200
    assert (
        client.post(f"{API}/auth/refresh", json={"refresh_token": new["refresh_token"]}).status_code
        == 200
    )


def test_the_user_is_told_their_password_changed(client: TestClient, db) -> None:
    register(client)
    ask(client)

    confirm(client, last_code())

    assert run(db.notifications.find({"event_type": "PASSWORD_RESET_SUCCESS"}).to_list(5))


# ---------- limits and switches ----------


def test_requests_are_limited_per_ip(client: TestClient, monkeypatch) -> None:
    monkeypatch.setitem(POLICIES, "reset_ip", Policy(2, 600))

    statuses = [ask(client, f"user{n}@example.com").status_code for n in range(4)]

    assert statuses == [202, 202, 429, 429]


def test_confirm_is_limited_per_ip(client: TestClient, monkeypatch) -> None:
    monkeypatch.setitem(POLICIES, "reset_ip", Policy(3, 600))

    statuses = [confirm(client, "123456").status_code for _ in range(5)]

    assert statuses == [400, 400, 400, 429, 429]


def test_everything_is_closed_while_the_flag_is_off(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "password_reset_self_service_enabled", False)
    register(client)

    assert ask(client).status_code == 403
    assert confirm(client, "123456").status_code == 403
    assert memory_outbox() == []


# ---------- start-up checks ----------


def test_switching_the_reset_on_in_production_needs_real_email() -> None:
    with pytest.raises(ValidationError, match="EMAIL_BACKEND=smtp"):
        Settings(
            _env_file=None,
            environment="production",
            jwt_secret_key="x" * 40,
            password_reset_self_service_enabled=True,
            email_backend="log",
        )


def test_smtp_needs_a_host_and_a_sender() -> None:
    with pytest.raises(ValidationError, match="SMTP_HOST and SMTP_FROM"):
        Settings(_env_file=None, email_backend="smtp")

    ok = Settings(
        _env_file=None, email_backend="smtp", smtp_host="smtp.example.com", smtp_from="a@b.co"
    )
    assert ok.smtp_port == 587 and ok.smtp_starttls is True


def test_production_with_smtp_and_the_reset_on_is_accepted() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        jwt_secret_key="x" * 40,
        password_reset_self_service_enabled=True,
        email_backend="smtp",
        smtp_host="smtp.example.com",
        smtp_from="noreply@example.com",
    )

    assert settings.password_reset_self_service_enabled


def test_an_unknown_email_backend_is_refused() -> None:
    with pytest.raises(ValidationError, match="EMAIL_BACKEND"):
        Settings(_env_file=None, email_backend="carrier-pigeon")


# ---------- the smtp sender itself ----------


def test_the_smtp_sender_builds_and_sends_a_message(monkeypatch) -> None:
    from app.services import email as email_module

    sent = {}

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            sent["server"] = (host, port)

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def starttls(self):
            sent["tls"] = True

        def login(self, user, password):
            sent["login"] = (user, password)

        def send_message(self, message):
            sent["message"] = message

    settings = get_settings()
    for name, value in {
        "smtp_host": "smtp.example.com",
        "smtp_port": 2525,
        "smtp_username": "mailer",
        "smtp_password": "secret",
        "smtp_from": "noreply@example.com",
        "smtp_starttls": True,
    }.items():
        monkeypatch.setattr(settings, name, value)
    monkeypatch.setattr(email_module.smtplib, "SMTP", FakeSMTP)

    run(email_module.SmtpEmailSender().send(email_module.Email("to@example.com", "Hi", "Body")))

    assert sent["server"] == ("smtp.example.com", 2525) and sent["tls"] is True
    assert sent["login"] == ("mailer", "secret")
    assert (
        sent["message"]["To"] == "to@example.com"
        and sent["message"]["From"] == "noreply@example.com"
    )


def test_hash_password_helper_is_still_used_for_the_new_password(client: TestClient, db) -> None:
    register(client)
    ask(client)
    confirm(client, last_code())

    stored = run(db.users.find_one({"email": EMAIL}))["password_hash"]

    assert stored != NEW and stored.startswith("$2") and hash_password(NEW) != stored
