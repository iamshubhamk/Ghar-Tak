"""T2-04: GET /app/config is public and comes from settings."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings, get_settings

URL = "/api/v1/app/config"


def test_is_public_and_has_the_agreed_shape(strict_client: TestClient) -> None:
    response = strict_client.get(URL)  # no Authorization header on purpose

    body = response.json()
    assert response.status_code == 200
    assert set(body) == {
        "min_supported_version",
        "latest_version",
        "play_store_url",
        "support_phone",
        "visit_charge_inr",
        "offer_ends_at",
        "assignment_promise",
        "flags",
    }
    assert body["assignment_promise"] == {
        "minutes": 30,
        "window_start": "08:00",
        "window_end": "22:00",
        "timezone": "Asia/Kolkata",
    }
    assert body["visit_charge_inr"] == 99.0


def test_unset_links_are_null_not_empty_strings(strict_client: TestClient) -> None:
    body = strict_client.get(URL).json()

    assert body["play_store_url"] is None and body["support_phone"] is None
    assert body["offer_ends_at"] is None


def test_values_come_from_settings(strict_client: TestClient, monkeypatch) -> None:
    settings = get_settings()
    changes = {
        "app_min_supported_version": "1.2.0",
        "app_latest_version": "1.4.1",
        "play_store_url": "https://play.google.com/store/apps/details?id=com.example",
        "support_phone": "9876500000",
        "launch_visit_charge_inr": 149,
        "launch_offer_ends_at": datetime(2026, 12, 31, 18, 30, tzinfo=UTC),
        "assignment_promise_minutes": 45,
        "service_window_start": "09:30",
        "service_window_end": "21:00",
        "app_flags": {"hindi_ui": True, "beta_chat": False},
    }
    for name, value in changes.items():
        monkeypatch.setattr(settings, name, value)

    body = strict_client.get(URL).json()

    assert body["min_supported_version"] == "1.2.0" and body["latest_version"] == "1.4.1"
    assert body["play_store_url"].startswith("https://play.google.com/")
    assert body["support_phone"] == "9876500000"
    assert body["visit_charge_inr"] == 149.0
    assert body["offer_ends_at"].startswith("2026-12-31T18:30")
    assert body["assignment_promise"]["minutes"] == 45
    assert (
        body["assignment_promise"]["window_start"],
        body["assignment_promise"]["window_end"],
    ) == (
        "09:30",
        "21:00",
    )
    assert body["flags"] == {"password_reset_enabled": False, "hindi_ui": True, "beta_chat": False}


def test_password_reset_flag_follows_the_setting(strict_client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "password_reset_self_service_enabled", True)

    assert strict_client.get(URL).json()["flags"]["password_reset_enabled"] is True


def test_can_be_cached_briefly_and_needs_no_database(strict_client: TestClient) -> None:
    response = strict_client.get(URL)

    assert response.headers["cache-control"] == "public, max-age=60"


def test_it_is_in_the_contract_with_a_stable_operation_id() -> None:
    from app.main import app

    operation = app.openapi()["paths"]["/api/v1/app/config"]["get"]

    assert operation["operationId"] == "app_get_config"
    assert operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith(
        "AppConfigResponse"
    )


# ---------- settings are validated at start-up ----------


def settings(**values) -> Settings:
    return Settings(_env_file=None, **values)


def test_minimum_version_above_latest_is_refused() -> None:
    with pytest.raises(ValidationError, match="lock every user out"):
        settings(app_min_supported_version="2.0.0", app_latest_version="1.9.9")


def test_versions_compare_numerically_not_as_text() -> None:
    assert settings(app_min_supported_version="1.9.0", app_latest_version="1.10.0")


@pytest.mark.parametrize("bad", ["1.0", "v1.0.0", "1.0.0-beta", ""])
def test_version_strings_must_be_three_numbers(bad) -> None:
    with pytest.raises(ValidationError):
        settings(app_latest_version=bad)


@pytest.mark.parametrize("bad", ["8", "25:00", "08:60", "8am"])
def test_service_window_must_be_hh_mm(bad) -> None:
    with pytest.raises(ValidationError):
        settings(service_window_start=bad)
