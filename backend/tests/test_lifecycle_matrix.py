"""Booking lifecycle grids from docs/qa/test-plan.md §1.2-1.5 (T1-16, ticket AR-010).

Expected values follow the approved policies P-1..P-4. Cases that today's code gets wrong are
`xfail(strict=True)` against the backend ticket that will fix them.
"""

import pytest

from app.core.enums import BookingStatus as S
from tests import lifecycle_support
from tests.lifecycle_support import World, xfail_until

world = lifecycle_support.world  # fixture lives in the shared support module

INVALID = "BOOKING_INVALID_STATUS"

# --- §1.2 role gate ------------------------------------------------------------------------

ENDPOINTS = [
    ("POST", "/bookings", "customer"),
    ("GET", "/bookings/my", "customer"),
    ("PATCH", "/bookings/{id}/cancel", "customer"),
    ("GET", "/provider/bookings", "provider"),
    ("PATCH", "/provider/bookings/{id}/accept", "provider"),
    ("PATCH", "/provider/bookings/{id}/reject", "provider"),
    ("PATCH", "/provider/bookings/{id}/on_the_way", "provider"),
    ("PATCH", "/provider/bookings/{id}/start", "provider"),
    ("PATCH", "/provider/bookings/{id}/in_progress", "provider"),
    ("PATCH", "/provider/bookings/{id}/complete", "provider"),
    ("PATCH", "/provider/bookings/{id}/mark-cash-paid", "provider"),
    ("GET", "/admin/bookings", "admin"),
    ("PATCH", "/admin/bookings/{id}/assign", "admin"),
    ("PATCH", "/admin/bookings/{id}/status", "admin"),
    ("PATCH", "/admin/bookings/{id}/mark-cash-paid", "admin"),
]
ROLES = ["customer", "provider", "admin"]


@pytest.mark.parametrize(("method", "path", "role"), ENDPOINTS)
def test_anonymous_gets_401(world: World, method, path, role) -> None:
    response = world.call(method, path.format(id="any"), None, json={})

    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "AUTH_REQUIRED"


@pytest.mark.parametrize(("method", "path", "role"), ENDPOINTS)
def test_wrong_role_gets_403(world: World, method, path, role) -> None:
    for other in (r for r in ROLES if r != role):
        token = getattr(world, other)
        response = world.call(method, path.format(id="any"), token, json={})
        assert response.status_code == 403, f"{other} on {method} {path}"


@pytest.mark.parametrize("role", ROLES)
def test_disabled_user_gets_403_account_disabled(world: World, role) -> None:
    user_id = {
        "customer": world.customer_id,
        "provider": world.provider_id,
        "admin": world.admin_id,
    }[role]
    listing = {
        "customer": "/bookings/my",
        "provider": "/provider/bookings",
        "admin": "/admin/bookings",
    }
    world.set_user_active(user_id, False)

    response = world.call("GET", listing[role], getattr(world, role))

    assert response.status_code == 403
    assert response.json()["detail"]["error"]["code"] == "ACCOUNT_DISABLED"


def test_token_role_claim_is_not_trusted(world: World) -> None:
    from app.core.security import create_access_token

    forged = create_access_token(subject=world.customer_id, role="ADMIN")

    assert world.call("GET", "/admin/bookings", forged).status_code == 403


# --- §1.3 ownership / not found -------------------------------------------------------------

UNKNOWN_ID_CALLS = [
    ("customer", "PATCH", "/bookings/{id}/cancel"),
    ("provider", "PATCH", "/provider/bookings/{id}/accept"),
    ("provider", "PATCH", "/provider/bookings/{id}/mark-cash-paid"),
    ("admin", "PATCH", "/admin/bookings/{id}/mark-cash-paid"),
]


@pytest.mark.parametrize(("actor", "method", "path"), UNKNOWN_ID_CALLS)
def test_unknown_booking_is_404_before_ownership(world: World, actor, method, path) -> None:
    response = world.call(method, path.format(id="does-not-exist"), getattr(world, actor), json={})

    assert response.status_code == 404
    assert response.json()["detail"]["error"]["code"] == "NOT_FOUND"


def test_other_customer_cannot_cancel(world: World) -> None:
    booking = world.new_booking()

    response = world.call("PATCH", f"/bookings/{booking.id}/cancel", world.other_customer, json={})

    assert response.status_code == 403
    assert booking.status == S.REQUESTED.value


@pytest.mark.parametrize("action", ["accept", "reject", "on_the_way", "start", "complete"])
def test_other_provider_cannot_act(world: World, action) -> None:
    booking = world.new_booking()

    response = world.call(
        "PATCH",
        f"/provider/bookings/{booking.id}/{action}",
        world.other_provider,
        json={"otp": booking.otp},
    )

    assert response.status_code == 403
    assert booking.status == S.REQUESTED.value


@pytest.mark.parametrize("action", ["accept", "reject", "on_the_way", "start", "complete"])
def test_provider_cannot_act_on_unassigned_booking(world: World, action) -> None:
    booking = world.new_booking(assigned=False)

    response = world.call(
        "PATCH",
        f"/provider/bookings/{booking.id}/{action}",
        world.provider,
        json={"otp": booking.otp},
    )

    assert response.status_code == 403


def test_provider_never_sees_the_otp_customer_does(world: World) -> None:
    booking = world.new_booking(status=S.ACCEPTED)

    as_provider = world.call("GET", "/provider/bookings", world.provider).json()
    as_customer = world.call("GET", "/bookings/my", world.customer).json()
    as_admin = world.call("GET", "/admin/bookings", world.admin).json()

    assert as_provider[0]["otp"] is None
    assert as_customer[0]["otp"] == booking.otp
    assert as_admin[0]["otp"] == booking.otp


# --- §1.4 customer cancel (P-4: allowed until the job starts) --------------------------------

CANCELLABLE = {S.REQUESTED, S.ACCEPTED, S.ON_THE_WAY}
CANCEL_CASES = [pytest.param(s, marks=xfail_until("T1-09")) if s == S.ON_THE_WAY else s for s in S]


@pytest.mark.parametrize("status", CANCEL_CASES)
def test_customer_cancel_until_the_job_starts(world: World, status) -> None:
    booking = world.new_booking(status=status)
    history_before = len(booking.doc()["status_history"])

    response = world.call("PATCH", f"/bookings/{booking.id}/cancel", world.customer, json={})

    if status in CANCELLABLE:
        assert response.status_code == 200
        assert response.json()["status"] == S.CANCELLED_BY_CUSTOMER.value
        last = booking.doc()["status_history"][-1]
        assert (last["from_status"], last["to_status"]) == (
            status.value,
            S.CANCELLED_BY_CUSTOMER.value,
        )
        assert last["actor_user_id"] == world.customer_id
        assert booking.notifications(user_id=world.provider_id), "provider must be told (P-4)"
    else:
        assert response.status_code == 422
        assert response.json()["detail"]["error"]["code"] == INVALID
        assert booking.status == status.value
        assert len(booking.doc()["status_history"]) == history_before


# --- §1.5 admin override (bound by the transition table) -------------------------------------

ADMIN_ALLOWED = {
    (S.REQUESTED, S.CANCELLED_BY_ADMIN),
    (S.ACCEPTED, S.CANCELLED_BY_ADMIN),
    (S.ON_THE_WAY, S.CANCELLED_BY_ADMIN),
    (S.IN_PROGRESS, S.CANCELLED_BY_ADMIN),
    (S.IN_PROGRESS, S.COMPLETED),
}
ADMIN_CASES = [pytest.param(f, t, id=f"{f.value}-to-{t.value}") for f in S for t in S]


@pytest.mark.parametrize(("current", "target"), ADMIN_CASES)
def test_admin_override_only_to_allowed_targets(world: World, current, target) -> None:
    booking = world.new_booking(status=current)
    history_before = len(booking.doc()["status_history"])

    response = world.call(
        "PATCH", f"/admin/bookings/{booking.id}/status", world.admin, json={"status": target.value}
    )

    if (current, target) in ADMIN_ALLOWED:
        assert response.status_code == 200
        assert response.json()["status"] == target.value
        last = booking.doc()["status_history"][-1]
        assert (last["from_status"], last["to_status"], last["actor_user_id"]) == (
            current.value,
            target.value,
            world.admin_id,
        )
    else:
        assert response.status_code == 422
        assert response.json()["detail"]["error"]["code"] == INVALID
        assert booking.status == current.value
        assert len(booking.doc()["status_history"]) == history_before


# --- §1.4 provider "release job" (P-3) -------------------------------------------------------

RELEASE_CASES = [pytest.param(s, marks=xfail_until("T1-09")) for s in S]


@pytest.mark.parametrize("status", RELEASE_CASES)
def test_provider_release_returns_job_to_admin_queue(world: World, status) -> None:
    booking = world.new_booking(status=status)

    response = world.call(
        "PATCH",
        f"/provider/bookings/{booking.id}/release",
        world.provider,
        json={"note": "Vehicle broke down"},
    )

    if status in (S.ACCEPTED, S.ON_THE_WAY):
        assert response.status_code == 200
        doc = booking.doc()
        assert doc["status"] == S.REQUESTED.value
        assert doc["provider_id"] is None
        assert doc["status_history"][-1]["note"] == "Vehicle broke down"
        assert booking.notifications(role="ADMIN"), "admin must be told (P-3)"
    else:
        assert response.status_code == 422
        assert response.json()["detail"]["error"]["code"] == INVALID
        assert booking.status == status.value
        assert booking.doc()["provider_id"] == world.provider_id


@xfail_until("T1-09")
def test_release_requires_a_reason(world: World) -> None:
    booking = world.new_booking(status=S.ACCEPTED)

    response = world.call(
        "PATCH", f"/provider/bookings/{booking.id}/release", world.provider, json={}
    )

    assert response.status_code == 422
    assert booking.status == S.ACCEPTED.value
