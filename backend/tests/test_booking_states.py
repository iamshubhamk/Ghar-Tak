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


ADMIN_ALLOWED = {
    (S.REQUESTED, S.CANCELLED_BY_ADMIN),
    (S.ACCEPTED, S.CANCELLED_BY_ADMIN),
    (S.ON_THE_WAY, S.CANCELLED_BY_ADMIN),
    (S.IN_PROGRESS, S.CANCELLED_BY_ADMIN),
    (S.IN_PROGRESS, S.COMPLETED),
}
ADMIN_CASES = [(f, t) for f in S for t in S]


@pytest.mark.parametrize(("from_status", "target"), ADMIN_CASES)
def test_admin_status_override_is_bound_by_the_transition_table(
    ctx: Ctx, from_status, target
) -> None:
    ctx.set_status(from_status)
    history_before = len(ctx.booking()["status_history"])

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/status",
        headers=ctx.headers(ctx.admin_token),
        json={"status": target.value},
    )

    if (from_status, target) in ADMIN_ALLOWED:
        assert response.status_code == 200
        assert response.json()["status"] == target.value
        assert len(ctx.booking()["status_history"]) == history_before + 1
    else:
        assert response.status_code == 422
        assert response.json()["detail"]["error"]["code"] == "BOOKING_INVALID_STATUS"
        assert ctx.booking()["status"] == from_status.value
        assert len(ctx.booking()["status_history"]) == history_before


def test_blocked_admin_override_does_not_write_final_amount(ctx: Ctx) -> None:
    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/status",
        headers=ctx.headers(ctx.admin_token),
        json={"status": "COMPLETED", "final_amount": 9999},
    )

    assert response.status_code == 422
    assert ctx.booking().get("final_amount") in (None, 0)


def test_admin_cannot_reopen_a_finished_booking(ctx: Ctx) -> None:
    ctx.set_status(S.COMPLETED)

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/status",
        headers=ctx.headers(ctx.admin_token),
        json={"status": S.REQUESTED.value},
    )

    assert response.status_code == 422
    assert ctx.booking()["status"] == S.COMPLETED.value


def test_transition_table_matches_the_documented_rules() -> None:
    from app.services.booking_rules import TRANSITIONS, Actor

    expected = {
        (Actor.CUSTOMER, S.REQUESTED): {S.CANCELLED_BY_CUSTOMER},
        (Actor.CUSTOMER, S.ACCEPTED): {S.CANCELLED_BY_CUSTOMER},
        (Actor.PROVIDER, S.REQUESTED): {S.ACCEPTED, S.REJECTED},
        (Actor.PROVIDER, S.ACCEPTED): {S.ON_THE_WAY, S.IN_PROGRESS},
        (Actor.PROVIDER, S.ON_THE_WAY): {S.IN_PROGRESS},
        (Actor.PROVIDER, S.IN_PROGRESS): {S.COMPLETED},
        (Actor.ADMIN, S.REQUESTED): {S.CANCELLED_BY_ADMIN},
        (Actor.ADMIN, S.ACCEPTED): {S.CANCELLED_BY_ADMIN},
        (Actor.ADMIN, S.ON_THE_WAY): {S.CANCELLED_BY_ADMIN},
        (Actor.ADMIN, S.IN_PROGRESS): {S.CANCELLED_BY_ADMIN, S.COMPLETED},
    }
    assert {k: set(v) for k, v in TRANSITIONS.items()} == expected
    final = {S.COMPLETED, S.REJECTED, S.CANCELLED_BY_CUSTOMER, S.CANCELLED_BY_PROVIDER,
             S.CANCELLED_BY_ADMIN}
    assert not any(current in final for (_, current) in TRANSITIONS)


def test_in_progress_alias_is_marked_deprecated_in_the_contract() -> None:
    from app.main import app

    paths = app.openapi()["paths"]
    operation = paths["/api/v1/provider/bookings/{booking_id}/in_progress"]["patch"]
    start = paths["/api/v1/provider/bookings/{booking_id}/start"]["patch"]

    assert operation["deprecated"] is True
    assert not start.get("deprecated")


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


# ---------- T1-05: compare-and-set (SU-007) ----------


@pytest.fixture
def freeze_read(monkeypatch: pytest.MonkeyPatch, ctx: Ctx):
    """Return freeze(): the service's next booking read sees the booking as it is at that moment,
    even if the DB changes afterwards (simulates another request winning the race)."""
    from copy import deepcopy

    from app.services.bookings import BookingService

    original = BookingService._get

    def freeze() -> None:
        snapshot = deepcopy(ctx.booking())
        used = {"first": False}

        async def get_stale_first(self, booking_id):
            if not used["first"]:
                used["first"] = True
                return deepcopy(snapshot)
            return await original(self, booking_id)

        monkeypatch.setattr(BookingService, "_get", get_stale_first)

    return freeze


def _force_status(ctx: Ctx, status: S) -> None:
    run(ctx.db.bookings.update_one({"id": ctx.booking_id}, {"$set": {"status": status.value}}))


def test_provider_accept_loses_when_customer_cancelled_in_between(ctx: Ctx, freeze_read) -> None:
    history_before = len(ctx.booking()["status_history"])
    freeze_read()
    _force_status(ctx, S.CANCELLED_BY_CUSTOMER)  # happens after the service read REQUESTED

    response = ctx.provider_action("accept")

    assert response.status_code == 409
    assert response.json()["detail"]["error"]["code"] == "BOOKING_STATE_CHANGED"
    assert ctx.booking()["status"] == S.CANCELLED_BY_CUSTOMER.value
    assert len(ctx.booking()["status_history"]) == history_before


def test_admin_complete_loses_and_does_not_save_final_amount(ctx: Ctx, freeze_read) -> None:
    ctx.set_status(S.IN_PROGRESS)
    freeze_read()
    _force_status(ctx, S.CANCELLED_BY_CUSTOMER)

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/status",
        headers=ctx.headers(ctx.admin_token),
        json={"status": "COMPLETED", "final_amount": 777},
    )

    assert response.status_code == 409
    assert response.json()["detail"]["error"]["code"] == "BOOKING_STATE_CHANGED"
    assert ctx.booking()["status"] == S.CANCELLED_BY_CUSTOMER.value
    assert ctx.booking().get("final_amount") != 777


def test_customer_cancel_loses_when_service_already_started(ctx: Ctx, freeze_read) -> None:
    ctx.set_status(S.ACCEPTED)
    freeze_read()
    _force_status(ctx, S.IN_PROGRESS)

    response = ctx.client.patch(
        f"/api/v1/bookings/{ctx.booking_id}/cancel",
        headers=ctx.headers(ctx.customer_token),
        json={},
    )

    assert response.status_code == 409
    assert ctx.booking()["status"] == S.IN_PROGRESS.value


def test_assign_loses_when_booking_moved_on_in_between(ctx: Ctx, freeze_read) -> None:
    freeze_read()
    _force_status(ctx, S.CANCELLED_BY_CUSTOMER)

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/assign",
        headers=ctx.headers(ctx.admin_token),
        json={"provider_id": ctx.provider_id},
    )

    assert response.status_code == 409
    assert response.json()["detail"]["error"]["code"] == "BOOKING_STATE_CHANGED"
    assert ctx.booking()["status"] == S.CANCELLED_BY_CUSTOMER.value


def test_assign_loses_when_another_admin_assigned_a_different_provider(
    ctx: Ctx, freeze_read
) -> None:
    other_id = run(ctx.db.users.find_one({"email": "states-other@example.com"}))["id"]
    freeze_read()
    run(ctx.db.bookings.update_one({"id": ctx.booking_id}, {"$set": {"provider_id": other_id}}))

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/assign",
        headers=ctx.headers(ctx.admin_token),
        json={"provider_id": ctx.provider_id},
    )

    assert response.status_code == 409
    assert ctx.booking()["provider_id"] == other_id


def test_two_admins_assigning_different_providers_only_one_wins(ctx: Ctx) -> None:
    import asyncio

    from app.services.bookings import BookingService

    other_id = run(ctx.db.users.find_one({"email": "states-other@example.com"}))["id"]
    admin = run(ctx.db.users.find_one({"email": "states-admin@example.com"}))
    ctx.set_status(S.REQUESTED)

    async def both():
        service = BookingService(ctx.db)
        return await asyncio.gather(
            service.assign_provider(admin, ctx.booking_id, ctx.provider_id),
            service.assign_provider(admin, ctx.booking_id, other_id),
            return_exceptions=True,
        )

    results = asyncio.run(both())

    winners = [r for r in results if isinstance(r, dict)]
    assert len(winners) >= 1
    final = ctx.booking()
    assert final["provider_id"] in (ctx.provider_id, other_id)
    assert final["status"] == S.REQUESTED.value
    failures = [r for r in results if not isinstance(r, dict)]
    assert all(getattr(f, "status_code", None) == 409 for f in failures)


def test_provider_accept_and_reject_race_has_exactly_one_winner(ctx: Ctx) -> None:
    import asyncio

    from app.services.bookings import BookingService

    provider = run(ctx.db.users.find_one({"id": ctx.provider_id}))
    ctx.set_status(S.REQUESTED)
    history_before = len(ctx.booking()["status_history"])

    async def both():
        service = BookingService(ctx.db)
        return await asyncio.gather(
            service.provider_action(provider, ctx.booking_id, "accept"),
            service.provider_action(provider, ctx.booking_id, "reject"),
            return_exceptions=True,
        )

    results = asyncio.run(both())

    winners = [r for r in results if isinstance(r, dict)]
    losers = [r for r in results if not isinstance(r, dict)]
    assert len(winners) == 1 and len(losers) == 1
    assert getattr(losers[0], "status_code", None) in (409, 422)
    assert ctx.booking()["status"] == winners[0]["status"]
    # one history entry for the winner, none for the loser
    assert len(ctx.booking()["status_history"]) == history_before + 1


# ---------- T1-06: providers who are no longer VERIFIED ----------


def _set_verification(ctx: Ctx, status: str) -> None:
    run(
        ctx.db.users.update_one(
            {"id": ctx.provider_id}, {"$set": {"provider_profile.verification_status": status}}
        )
    )


def test_unverified_provider_cannot_mark_cash_paid(ctx: Ctx) -> None:
    ctx.set_status(S.COMPLETED)
    _set_verification(ctx, "PENDING_VERIFICATION")

    response = ctx.client.patch(
        f"/api/v1/provider/bookings/{ctx.booking_id}/mark-cash-paid",
        headers=ctx.headers(ctx.provider_token),
        json={},
    )

    assert response.status_code == 403
    assert response.json()["detail"]["error"]["code"] == "PROVIDER_NOT_VERIFIED"
    assert ctx.booking()["payment_status"] != "PAID_CASH"


def test_admin_can_still_mark_cash_paid_when_provider_is_unverified(ctx: Ctx) -> None:
    ctx.set_status(S.COMPLETED)
    _set_verification(ctx, "DISABLED")

    response = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/mark-cash-paid",
        headers=ctx.headers(ctx.admin_token),
        json={},
    )

    assert response.status_code == 200


def test_rejecting_a_provider_flags_their_in_progress_job_for_the_admin(ctx: Ctx) -> None:
    ctx.set_status(S.IN_PROGRESS)

    ctx.client.patch(
        f"/api/v1/admin/providers/{ctx.provider_id}/reject",
        headers=ctx.headers(ctx.admin_token),
        json={},
    )

    admin_view = ctx.client.get(
        "/api/v1/admin/bookings", headers=ctx.headers(ctx.admin_token)
    ).json()
    mine = next(b for b in admin_view if b["id"] == ctx.booking_id)
    assert mine["needs_admin_attention"] is True
    assert mine["status"] == "IN_PROGRESS" and mine["provider_id"] == ctx.provider_id
    query = {"event_type": "BOOKING_NEEDS_ATTENTION"}
    assert run(ctx.db.notifications.find(query).to_list(10))


def test_released_booking_can_be_assigned_to_another_provider(ctx: Ctx) -> None:
    other_id = run(ctx.db.users.find_one({"email": "states-other@example.com"}))["id"]
    ctx.provider_action("accept")

    ctx.client.patch(
        f"/api/v1/admin/providers/{ctx.provider_id}/disable",
        headers=ctx.headers(ctx.admin_token),
        json={},
    )
    reassigned = ctx.client.patch(
        f"/api/v1/admin/bookings/{ctx.booking_id}/assign",
        headers=ctx.headers(ctx.admin_token),
        json={"provider_id": other_id},
    )

    assert reassigned.status_code == 200
    assert reassigned.json()["provider_id"] == other_id
    assert reassigned.json()["status"] == "REQUESTED"


def test_only_open_jobs_of_that_provider_move(ctx: Ctx) -> None:
    ctx.set_status(S.COMPLETED)

    ctx.client.patch(
        f"/api/v1/admin/providers/{ctx.provider_id}/reject",
        headers=ctx.headers(ctx.admin_token),
        json={},
    )

    assert ctx.booking()["status"] == "COMPLETED"
    assert ctx.booking()["provider_id"] == ctx.provider_id


# ---------- T1-07: categories change only through an approved skill request ----------


def _category_names(ctx: Ctx) -> list[str]:
    user = run(ctx.db.users.find_one({"id": ctx.provider_id}))
    return user["provider_profile"]["category_names"]


def test_profile_patch_ignores_category_ids_but_still_updates_other_fields(ctx: Ctx) -> None:
    before = _category_names(ctx)

    response = ctx.client.patch(
        "/api/v1/provider/me",
        headers=ctx.headers(ctx.provider_token),
        json={"category_ids": [], "bio": "New bio"},
    )

    assert response.status_code == 200
    assert _category_names(ctx) == before  # an empty list no longer wipes the skills either
    assert response.json()["bio"] == "New bio"


def test_resubmit_stores_canonical_names_of_active_categories(ctx: Ctx) -> None:
    response = ctx.client.post(
        "/api/v1/provider/me/resubmit",
        headers=ctx.headers(ctx.provider_token),
        data={"categories": ["electrician"]},
    )

    assert response.status_code == 200
    assert _category_names(ctx) == ["Electrician"]


def test_resubmit_rejects_unknown_or_inactive_categories(ctx: Ctx) -> None:
    run(ctx.db.categories.update_one({"id": ctx.category_id}, {"$set": {"is_active": False}}))
    before = _category_names(ctx)

    inactive = ctx.client.post(
        "/api/v1/provider/me/resubmit",
        headers=ctx.headers(ctx.provider_token),
        data={"categories": ["Electrician"]},
    )

    assert inactive.status_code == 422
    assert inactive.json()["detail"]["error"]["details"]["unknown_categories"] == ["Electrician"]
    assert _category_names(ctx) == before
