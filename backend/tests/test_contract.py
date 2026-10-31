"""T2-07 (ADR 0006): the OpenAPI contract is complete and committed.

Generated mobile/web clients are only as good as this file, so these tests fail when a route is
added without a response type, a stable operation id, or when the exported file is stale.
"""

import json
import re
from pathlib import Path

import pytest

from app.main import app

METHODS = ("get", "post", "put", "patch", "delete")
CONTRACT = Path(__file__).resolve().parents[2] / ".coordination" / "contracts" / "openapi.json"


@pytest.fixture(scope="module")
def spec() -> dict:
    return app.openapi()


def operations(spec: dict):
    for path, item in spec["paths"].items():
        for method, operation in item.items():
            if method in METHODS:
                yield method.upper(), path, operation


def test_every_route_declares_what_it_returns(spec: dict) -> None:
    untyped = []
    for method, path, operation in operations(spec):
        success = {code: r for code, r in operation["responses"].items() if code[0] in "23"}
        typed = any(
            code in ("204", "302")
            or r.get("content", {}).get("application/json", {}).get("schema")
            or r.get("content", {}).get("application/octet-stream", {}).get("schema")
            for code, r in success.items()
        )
        if not typed:
            untyped.append(f"{method} {path}")

    assert untyped == []


def test_operation_ids_are_unique_stable_and_readable(spec: dict) -> None:
    ids = [operation["operationId"] for _, _, operation in operations(spec)]

    assert len(ids) == len(set(ids)), "duplicate operationId"
    for operation_id in ids:
        assert re.fullmatch(r"[a-z][a-z0-9]*(_[a-z0-9]+)+", operation_id), operation_id
        assert "api_v1" not in operation_id, f"{operation_id} still contains the URL"


def test_known_operation_ids_do_not_change(spec: dict) -> None:
    """Clients are generated from these names. Renaming one is a breaking change for them."""
    ids = {operation["operationId"] for _, _, operation in operations(spec)}

    assert {
        "auth_login",
        "auth_refresh",
        "auth_logout",
        "auth_register_customer",
        "app_get_config",
        "bookings_create_booking",
        "categories_list_categories",
    } <= ids


def test_the_error_body_is_a_named_schema_used_by_every_operation(spec: dict) -> None:
    schemas = spec["components"]["schemas"]
    assert {"ErrorResponse", "ErrorEnvelope", "ErrorBody"} <= set(schemas)
    assert set(schemas["ErrorBody"]["required"]) == {"code", "message"}

    for method, path, operation in operations(spec):
        if not path.startswith("/api/v1"):
            continue  # the plain `GET /` service banner has no error cases
        for code in ("401", "403", "404", "409", "422", "429"):
            schema = operation["responses"].get(code, {}).get("content", {})
            ref = schema.get("application/json", {}).get("schema", {}).get("$ref", "")
            assert ref.endswith("/ErrorResponse"), f"{method} {path} {code}"


def test_enums_are_exported_so_clients_get_literal_unions(spec: dict) -> None:
    schemas = spec["components"]["schemas"]

    for name, values in {
        "BookingStatus": {"REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"},
        "UserRole": {"CUSTOMER", "PROVIDER", "ADMIN"},
        "VerificationStatus": {"PENDING_VERIFICATION", "VERIFIED", "REJECTED", "DISABLED"},
        "PaymentStatus": {"CASH_PENDING", "PAID_CASH"},
        "PaymentMode": {"CASH_ON_SERVICE"},
        "AvailabilityStatus": {"AVAILABLE", "UNAVAILABLE"},
        "ReviewStatus": {"VISIBLE", "HIDDEN_BY_ADMIN"},
        "SkillRequestStatus": {"PENDING", "APPROVED", "REJECTED"},
    }.items():
        assert values <= set(schemas[name]["enum"]), name


def test_status_fields_use_the_enums_not_plain_strings(spec: dict) -> None:
    schemas = spec["components"]["schemas"]

    assert schemas["SkillRequestResponse"]["properties"]["status"]["$ref"].endswith(
        "/SkillRequestStatus"
    )
    assert schemas["BookingResponse"]["properties"]["status"]["$ref"].endswith("/BookingStatus")
    assert schemas["UserResponse"]["properties"]["role"]["$ref"].endswith("/UserRole")


def test_file_downloads_are_described_as_files(spec: dict) -> None:
    operation = spec["paths"]["/api/v1/providers/{provider_id}/adhaar"]["get"]

    assert operation["responses"]["200"]["content"]["application/octet-stream"]["schema"] == {
        "type": "string",
        "format": "binary",
    }
    assert "302" in operation["responses"]


def test_deprecated_routes_are_marked(spec: dict) -> None:
    operation = spec["paths"]["/api/v1/provider/bookings/{booking_id}/in_progress"]["patch"]

    assert operation["deprecated"] is True


def test_the_committed_contract_matches_the_code(spec: dict) -> None:
    """Rule 6: re-export after a code change (`python -m scripts.export_openapi` in backend/).

    The CI drift gate does the same with `git diff --exit-code`.
    """
    committed = json.loads(CONTRACT.read_text(encoding="utf-8"))

    assert committed == json.loads(
        json.dumps(spec)
    ), "openapi.json is out of date: run `python -m scripts.export_openapi` from backend/"
