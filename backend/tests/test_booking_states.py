"""Characterization tests for the booking state machine (Rule 8/9).

They pin down what `services/bookings.py` does today, before the central transition table
(OR-001 item 6). Statuses are set directly in the DB so each case starts from a known state.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.core.enums import BookingStatus as S
from app.core.security import create_access_token
from app.services.auth import AuthService
from tests.conftest import run

PROVIDER_ACTIONS = ["accept", "reject", "on_the_way", "start", "in_progress", "complete"]

# action -> {from_status: to_status}; start/in_progress also need the customer's OTP.
ALLOWED = {
    "accept": {S.REQUESTED: S.ACCEPTED},
    "reject": {S.REQUESTED: S.REJECTED},
    "on_the_way": {S.ACCEPTED: S.ON_THE_WAY},
    "start": {S.ACCEPTED: S.IN_PROGRESS, S.ON_THE_WAY: S.IN_PROGRESS},
    "in_progress": {S.ACCEPTED: S.IN_PROGRESS, S.ON_THE_WAY: S.IN_PROGRESS},
    "complete": {S.IN_PROGRESS: S.COMPLETED},
}

ALLOWED_CASES = [(a, f, t) for a, moves in ALLOWED.items() for f, t in moves.items()]
DISALLOWED_CASES = [(a, s) for a in PROVIDER_ACTIONS for s in S if s not in ALLOWED[a]]


@dataclass
class Ctx:
    client: TestClient
    db: Any
    booking_id: str
    category_id: str
    otp: str
    provider_id: str
    customer_token: str
    provider_token: str
    admin_token: str
    other_provider_token: str

    def headers(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def set_status(self, status: S) -> None:
        update = {"$set": {"status": status.value}}
        run(self.db.bookings.update_one({"id": self.booking_id}, update))

    def booking(self) -> dict:
        return run(self.db.bookings.find_one({"id": self.booking_id}))

    def provider_action(self, action: str, token: str | None = None, **body: Any) -> Any:
        if action in ("start", "in_progress"):
            body.setdefault("otp", self.otp)
        return self.client.patch(
            f"/api/v1/provider/bookings/{self.booking_id}/{action}",
            headers=self.headers(token or self.provider_token),
            json=body,
        )


def _register_provider(client: TestClient, category_id: str, admin_token: str, email: str):
    body = client.post(
        "/api/v1/auth/register/provider",
        json={
            "name": "Provider",
            "email": email,
            "password": "strongpass123",
            "category_ids": [category_id],
            "localities": ["Boring Road"],
        },
    ).json()
    provider_id = body["user"]["id"]
    client.patch(
        f"/api/v1/admin/providers/{provider_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    return provider_id, body["access_token"]


@pytest.fixture
def ctx(client: TestClient, db: Any) -> Ctx:
    admin = run(
        AuthService(db).create_admin_user(
            name="Admin", email="states-admin@example.com", password="strongpass123"
        )
    )
    admin_token = create_access_token(subject=admin["id"], role=admin["role"])
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    category_id = client.post(
        "/api/v1/admin/categories", headers=admin_h, json={"name": "Electrician"}
    ).json()["id"]
    provider_id, provider_token = _register_provider(
        client, category_id, admin_token, "states-provider@example.com"
    )
    _, other_provider_token = _register_provider(
        client, category_id, admin_token, "states-other@example.com"
    )
    customer_token = client.post(
        "/api/v1/auth/register/customer",
        json={"name": "Cust", "email": "states-cust@example.com", "password": "strongpass123"},
    ).json()["access_token"]
    booking = client.post(
        "/api/v1/bookings",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "category_id": category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Fan",
        },
    ).json()
    assigned = client.patch(
        f"/api/v1/admin/bookings/{booking['id']}/assign",
        headers=admin_h,
        json={"provider_id": provider_id},
    )
    assert assigned.status_code == 200
    return Ctx(
        client=client,
        db=db,
        booking_id=booking["id"],
        category_id=category_id,
        otp=booking["otp"],
        provider_id=provider_id,
        customer_token=customer_token,
        provider_token=provider_token,
        admin_token=admin_token,
        other_provider_token=other_provider_token,
    )


@pytest.mark.parametrize(("action", "from_status", "to_status"), ALLOWED_CASES)
def test_provider_allowed_transitions(ctx: Ctx, action, from_status, to_status) -> None:
    ctx.set_status(from_status)
    history_before = len(ctx.booking()["status_history"])

    response = ctx.provider_action(action)

    assert response.status_code == 200
    assert response.json()["status"] == to_status.value
    booking = ctx.booking()
    assert booking["status"] == to_status.value
    assert len(booking["status_history"]) == history_before + 1
    last = booking["status_history"][-1]
    assert (last["from_status"], last["to_status"]) == (from_status.value, to_status.value)


@pytest.mark.parametrize(("action", "status"), DISALLOWED_CASES)
def test_provider_disallowed_transitions_are_rejected_and_change_nothing(
    ctx: Ctx, action, status
) -> None:
    ctx.set_status(status)
    history_before = len(ctx.booking()["status_history"])

    response = ctx.provider_action(action)

    assert response.status_code == 422
    assert response.json()["detail"]["error"]["code"] == "BOOKING_INVALID_STATUS"
    assert ctx.booking()["status"] == status.value
    assert len(ctx.booking()["status_history"]) == history_before


def test_start_and_in_progress_are_equivalent(ctx: Ctx) -> None:
    results = []
    for action in ("start", "in_progress"):
        ctx.set_status(S.ACCEPTED)
        response = ctx.provider_action(action)
        results.append((response.status_code, response.json()["status"]))
    assert results[0] == results[1] == (200, "IN_PROGRESS")


@pytest.mark.parametrize("action", ["start", "in_progress"])
def test_start_requires_correct_customer_otp(ctx: Ctx, action) -> None:
    ctx.set_status(S.ACCEPTED)

    missing = ctx.client.patch(
        f"/api/v1/provider/bookings/{ctx.booking_id}/{action}",
        headers=ctx.headers(ctx.provider_token),
        json={},
    )
    wrong = ctx.provider_action(action, otp="0000" if ctx.otp != "0000" else "1111")

    assert missing.status_code == 400
    assert wrong.status_code == 400
    assert ctx.booking()["status"] == S.ACCEPTED.value


def test_complete_records_final_amount(ctx: Ctx) -> None:
    ctx.set_status(S.IN_PROGRESS)

    response = ctx.provider_action("complete", final_amount=450)

    assert response.status_code == 200
    assert response.json()["final_amount"] == 450.0


def test_unassigned_provider_cannot_act(ctx: Ctx) -> None:
    response = ctx.provider_action("accept", token=ctx.other_provider_token)

    assert response.status_code == 403
    assert ctx.booking()["status"] == S.REQUESTED.value


def test_customer_cannot_use_provider_actions(ctx: Ctx) -> None:
    response = ctx.provider_action("accept", token=ctx.customer_token)

    assert response.status_code == 403
    assert ctx.booking()["status"] == S.REQUESTED.value


@pytest.mark.parametrize("status", list(S))
def test_customer_cancel_only_from_requested_or_accepted(ctx: Ctx, status) -> None:
    ctx.set_status(status)

    response = ctx.client.patch(
        f"/api/v1/bookings/{ctx.booking_id}/cancel",
        headers=ctx.headers(ctx.customer_token),
        json={},
    )

    if status in (S.REQUESTED, S.ACCEPTED):
        assert response.status_code == 200
        assert response.json()["status"] == S.CANCELLED_BY_CUSTOMER.value
    else:
        assert response.status_code == 422
        assert response.json()["detail"]["error"]["code"] == "BOOKING_INVALID_STATUS"
        assert ctx.booking()["status"] == status.value


def test_other_customer_cannot_cancel(ctx: Ctx) -> None:
    other = ctx.client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Other",
            "email": "states-other-cust@example.com",
            "password": "strongpass123",
        },
    ).json()["access_token"]

    response = ctx.client.patch(
        f"/api/v1/bookings/{ctx.booking_id}/cancel", headers=ctx.headers(other), json={}
    )

    assert response.status_code == 403


@pytest.mark.parametrize("status", list(S))
def test_admin_assign_only_from_requested_or_rejected(ctx: Ctx, status) -> None:
    ctx.set_status(status)

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/assign",
        headers=ctx.headers(ctx.admin_token),
        json={"provider_id": ctx.provider_id},
    )

    if status in (S.REQUESTED, S.REJECTED):
        assert response.status_code == 200
        assert response.json()["status"] == S.REQUESTED.value
    else:
        assert response.status_code == 422
        assert ctx.booking()["status"] == status.value


@pytest.mark.parametrize("status", list(S))
def test_cash_paid_only_after_completed(ctx: Ctx, status) -> None:
    ctx.set_status(status)

    response = ctx.client.patch(
        f"/api/v1/provider/bookings/{ctx.booking_id}/mark-cash-paid",
        headers=ctx.headers(ctx.provider_token),
        json={},
    )

    if status == S.COMPLETED:
        assert response.status_code == 200
        assert response.json()["payment_status"] == "PAID_CASH"
    else:
        assert response.status_code == 422
        assert ctx.booking()["payment_status"] != "PAID_CASH"


def test_each_transition_notifies_the_customer(ctx: Ctx) -> None:
    ctx.provider_action("accept")

    notifications = run(ctx.db.notifications.find({}).to_list(100))

    assert any("ACCEPTED" in n["message"] for n in notifications)


def test_known_gap_admin_can_force_any_status_transition(ctx: Ctx) -> None:
    """KNOWN GAP (raised to the Architect in BE-002): admin_update_status skips transition rules.

    When the central transition table lands (OR-001 item 6) and the Architect decides admins are
    bound by it, flip this test to expect 422.
    """
    ctx.set_status(S.COMPLETED)

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/status",
        headers=ctx.headers(ctx.admin_token),
        json={"status": S.REQUESTED.value},
    )

    assert response.status_code == 200
    assert response.json()["status"] == S.REQUESTED.value


def _new_booking(ctx: Ctx, **extra: Any) -> Any:
    return ctx.client.post(
        "/api/v1/bookings",
        headers=ctx.headers(ctx.customer_token),
        json={
            "category_id": ctx.category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Tap leak",
            **extra,
        },
    )


def test_booking_location_round_trips(ctx: Ctx) -> None:
    created = _new_booking(ctx, latitude=25.5941, longitude=85.1376)

    assert created.status_code == 201
    assert (created.json()["latitude"], created.json()["longitude"]) == (25.5941, 85.1376)
    mine = ctx.client.get("/api/v1/bookings/my", headers=ctx.headers(ctx.customer_token)).json()
    assert any(b["latitude"] == 25.5941 and b["longitude"] == 85.1376 for b in mine)
    admin = ctx.client.get("/api/v1/admin/bookings", headers=ctx.headers(ctx.admin_token)).json()
    assert any(b["latitude"] == 25.5941 for b in admin)


def test_booking_location_is_optional(ctx: Ctx) -> None:
    created = _new_booking(ctx)

    assert created.status_code == 201
    assert created.json()["latitude"] is None and created.json()["longitude"] is None


@pytest.mark.parametrize(
    "location", [{"latitude": 91, "longitude": 85}, {"latitude": 25, "longitude": -181}]
)
def test_booking_location_out_of_range_is_rejected(ctx: Ctx, location) -> None:
    assert _new_booking(ctx, **location).status_code == 422
