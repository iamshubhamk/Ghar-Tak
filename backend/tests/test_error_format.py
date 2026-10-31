"""T2-08: one error format, rolled out the Rule 7 way.

Every error carries the new `error` object and, for one release, the old body under `detail`.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.error_format import error_content
from app.core.rate_limit import POLICIES, Policy
from app.main import app
from tests.conftest import run

API = "/api/v1"


def assert_new_shape(body: dict) -> dict:
    assert set(body["error"]) == {"code", "message", "details"}
    assert isinstance(body["error"]["code"], str) and body["error"]["code"]
    assert isinstance(body["error"]["message"], str) and body["error"]["message"]
    assert isinstance(body["error"]["details"], dict)
    return body["error"]


def register(client: TestClient, phone="9876543210"):
    return client.post(
        f"{API}/auth/register/customer",
        json={"name": "Asha Devi", "phone": phone, "password": "strongpass123"},
    ).json()["access_token"]


def test_an_app_error_has_both_shapes_with_the_same_content(strict_client: TestClient) -> None:
    response = strict_client.get(f"{API}/auth/me")  # no token

    body = response.json()
    error = assert_new_shape(body)
    assert response.status_code == 401 and error["code"] == "AUTH_REQUIRED"
    assert body["detail"] == {"error": error}  # the old body is unchanged and identical


def test_a_plain_text_error_gets_a_code_and_keeps_its_old_detail(
    strict_client: TestClient, admin_token
) -> None:
    response = strict_client.get(
        f"{API}/providers/no-such-provider/adhaar",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    body = response.json()
    assert response.status_code == 404
    assert isinstance(body["detail"], str)  # old clients still get their string
    error = assert_new_shape(body)
    assert error["code"] == "NOT_FOUND" and error["message"] == body["detail"]


def test_validation_errors_keep_the_field_list_in_details(strict_client: TestClient) -> None:
    response = strict_client.post(f"{API}/auth/register/customer", json={"name": "A"})

    body = response.json()
    error = assert_new_shape(body)
    assert response.status_code == 422 and error["code"] == "VALIDATION_ERROR"
    assert error["details"]["errors"] and body["detail"]["error"]["details"]["errors"]
    assert {entry["loc"][-1] for entry in error["details"]["errors"]} >= {"password", "name"}


def test_an_unknown_url_uses_the_same_shape(strict_client: TestClient) -> None:
    response = strict_client.get(f"{API}/no-such-thing")

    error = assert_new_shape(response.json())
    assert response.status_code == 404 and error["code"] == "NOT_FOUND"
    assert response.json()["detail"] == "Not Found"


def test_a_wrong_method_uses_the_same_shape(strict_client: TestClient) -> None:
    response = strict_client.put(f"{API}/auth/login")

    error = assert_new_shape(response.json())
    assert response.status_code == 405 and error["code"] == "METHOD_NOT_ALLOWED"


def test_rate_limit_errors_keep_retry_after_and_details(
    strict_client: TestClient, monkeypatch
) -> None:
    monkeypatch.setitem(POLICIES, "refresh_ip", Policy(1, 60))
    strict_client.post(f"{API}/auth/refresh", json={"refresh_token": "x" * 43})

    response = strict_client.post(f"{API}/auth/refresh", json={"refresh_token": "x" * 43})

    error = assert_new_shape(response.json())
    assert response.status_code == 429 and error["code"] == "RATE_LIMITED"
    assert error["details"]["retry_after_seconds"] == int(response.headers["retry-after"])


def test_an_unexpected_crash_hides_the_cause_but_uses_the_shape() -> None:
    import json

    from starlette.requests import Request

    from app.main import global_exception_handler

    request = Request(
        {"type": "http", "method": "GET", "path": "/x", "headers": [], "query_string": b""}
    )

    response = run(global_exception_handler(request, RuntimeError("secret internal detail")))

    body = json.loads(response.body)
    error = assert_new_shape(body)
    assert response.status_code == 500 and error["code"] == "SERVER_ERROR"
    assert "secret internal detail" not in response.body.decode()
    assert body["detail"] == "Internal server error. Please try again later."


@pytest.mark.parametrize(
    ("environment", "debug", "expected"),
    [
        ("local", True, True),
        ("local", False, False),
        ("production", True, False),
        ("staging", True, False),
    ],
)
def test_debug_pages_only_exist_locally(environment, debug, expected) -> None:
    from app.core.config import Settings

    settings = Settings(
        _env_file=None, environment=environment, debug=debug, jwt_secret_key="x" * 40
    )

    assert settings.debug_enabled is expected


def test_upload_errors_use_the_shape(strict_client: TestClient) -> None:
    token = register(strict_client)

    response = strict_client.post(
        f"{API}/customer/me/photo",
        headers={"Authorization": f"Bearer {token}"},
        files={"profile_photo": ("x.png", b"<html></html>", "image/png")},
    )

    error = assert_new_shape(response.json())
    assert response.status_code == 415 and error["code"] == "UPLOAD_TYPE_NOT_ALLOWED"


@pytest.mark.parametrize(
    ("status", "detail", "code"),
    [
        (400, "Bad value", "BAD_REQUEST"),
        (403, "Nope", "FORBIDDEN"),
        (409, "Taken", "CONFLICT"),
        (418, "Teapot", "ERROR"),
        (503, "Down", "SERVER_ERROR"),
    ],
)
def test_text_errors_get_a_code_from_the_status(status, detail, code) -> None:
    content = error_content(status, detail)

    assert content["error"] == {"code": code, "message": detail, "details": {}}
    assert content["detail"] == detail


def test_a_non_text_detail_still_gets_a_message() -> None:
    content = error_content(400, ["a", "list"])

    assert content["error"]["message"]
    assert content["detail"] == ["a", "list"]


def test_the_contract_names_error_as_the_main_field_and_detail_as_deprecated() -> None:
    schemas = app.openapi()["components"]["schemas"]
    response = schemas["ErrorResponse"]

    assert "error" in response["required"] and "detail" not in response.get("required", [])
    assert response["properties"]["detail"]["deprecated"] is True
    assert response["properties"]["error"]["$ref"].endswith("/ErrorBody")
