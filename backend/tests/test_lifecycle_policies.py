"""Booking policies P-1..P-4 and the SU-004..SU-009 fixes (docs/qa/test-plan.md §1.3, 1.6-1.8, 3.3).

Each test names the backend ticket that delivers it. A test with `xfail_until(ticket)` describes
behaviour that ticket has not delivered yet; remove the mark when the ticket lands.
"""

from datetime import UTC, datetime, timedelta, timezone

import pytest

from app.core.enums import BookingStatus as S
from app.services.bookings import BookingService
from tests import lifecycle_support
from tests.lifecycle_support import World, run, xfail_until

world = lifecycle_support.world  # fixture lives in the shared support module

VISIT_CHARGE = 99.0
IST = timezone(timedelta(hours=5, minutes=30))

# --- P-1 / SU-005 (T1-06): providers who are no longer VERIFIED -------------------------------


@pytest.mark.parametrize("verification", ["PENDING_VERIFICATION", "REJECTED", "DISABLED"])
@pytest.mark.parametrize("action", ["accept", "on_the_way", "start", "complete"])
def test_non_verified_provider_cannot_act(world: World, verification, action) -> None:
    booking = world.new_booking(status=S.ACCEPTED)
    world.set_verification(world.provider_id, verification)

    response = world.call(
        "PATCH",
        f"/provider/bookings/{booking.id}/{action}",
        world.provider,
        json={"otp": booking.otp},
    )

    assert response.status_code == 403
    assert booking.status == S.ACCEPTED.value


@pytest.mark.parametrize("admin_action", ["reject", "disable"])
@pytest.mark.parametrize("status", [S.REQUESTED, S.ACCEPTED, S.ON_THE_WAY])
def test_admin_removing_a_provider_sends_open_jobs_back_to_the_queue(
    world: World, admin_action, status
) -> None:
    booking = world.new_booking(status=status)

    response = world.call(
        "PATCH", f"/admin/providers/{world.provider_id}/{admin_action}", world.admin, json={}
    )

    assert response.status_code == 200
    doc = booking.doc()
    assert doc["status"] == S.REQUESTED.value
    assert doc["provider_id"] is None
    assert doc["status_history"][-1]["to_status"] == S.REQUESTED.value
    assert booking.notifications(
        user_id=world.customer_id, event_type="BOOKING_RELEASED"
    ), "customer must be told"
    assert booking.notifications(role="ADMIN", event_type="BOOKING_RELEASED"), "admin must be told"


def test_resubmitting_provider_sends_open_jobs_back_to_the_queue(world: World) -> None:
    booking = world.new_booking(status=S.ACCEPTED)

    response = world.call(
        "POST", "/provider/me/resubmit", world.provider, data={"bio": "Updated profile"}
    )

    assert response.status_code == 200
    assert booking.doc()["provider_id"] is None
    assert booking.status == S.REQUESTED.value


@pytest.mark.parametrize("admin_action", ["reject", "disable"])
def test_in_progress_job_stays_with_provider_for_admin_to_resolve(
    world: World, admin_action
) -> None:
    booking = world.new_booking(status=S.IN_PROGRESS)

    world.call(
        "PATCH", f"/admin/providers/{world.provider_id}/{admin_action}", world.admin, json={}
    )

    doc = booking.doc()
    assert doc["status"] == S.IN_PROGRESS.value
    assert doc["provider_id"] == world.provider_id


# --- SU-007 (T1-05): atomic transitions ----------------------------------------------------


def test_stale_provider_accept_loses_to_a_concurrent_customer_cancel(
    world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Provider read REQUESTED, then the customer cancelled before the provider's write landed."""
    booking = world.new_booking()
    stale = run(BookingService(world.db)._get(booking.id))
    world.call("PATCH", f"/bookings/{booking.id}/cancel", world.customer, json={})
    assert booking.status == S.CANCELLED_BY_CUSTOMER.value
    history = len(booking.doc()["status_history"])

    async def stale_get(self, booking_id):
        return stale

    monkeypatch.setattr(BookingService, "_get", stale_get)
    response = world.call(
        "PATCH", f"/provider/bookings/{booking.id}/accept", world.provider, json={}
    )

    assert response.status_code == 409
    assert response.json()["detail"]["error"]["code"] == "BOOKING_STATE_CHANGED"
    assert booking.status == S.CANCELLED_BY_CUSTOMER.value
    assert len(booking.doc()["status_history"]) == history  # no phantom ACCEPTED entry


def test_stale_second_complete_does_not_write_twice(
    world: World, monkeypatch: pytest.MonkeyPatch
) -> None:
    booking = world.new_booking(status=S.IN_PROGRESS)
    stale = run(BookingService(world.db)._get(booking.id))
    assert world.call("PATCH", f"/provider/bookings/{booking.id}/complete", world.provider, json={})
    history = len(booking.doc()["status_history"])

    async def stale_get(self, booking_id):
        return stale

    monkeypatch.setattr(BookingService, "_get", stale_get)
    response = world.call(
        "PATCH", f"/provider/bookings/{booking.id}/complete", world.provider, json={}
    )

    assert response.status_code == 409
    assert len(booking.doc()["status_history"]) == history


# --- SU-004 / P-2 (T1-08): the server sets the amount -----------------------------------------


@xfail_until("T1-08")
def test_client_totals_are_ignored_visit_charge_is_server_set(world: World) -> None:
    booking = world.new_booking(
        total_amount=1, subtotal=1, platform_fee=0, discount=0, assigned=False
    )

    doc = booking.doc()
    assert doc["total_amount"] == VISIT_CHARGE
    assert doc["final_amount"] == VISIT_CHARGE


@xfail_until("T1-08")
def test_negative_item_price_cannot_lower_the_total(world: World) -> None:
    response = world.call(
        "POST",
        "/bookings",
        world.customer,
        json={
            "category_id": world.category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "items": [{"id": "x", "name": "Tap repair", "price": -500, "quantity": 1}],
        },
    )

    assert response.status_code == 422 or response.json()["total_amount"] == VISIT_CHARGE


@xfail_until("T1-08")
def test_item_quantity_below_one_is_rejected(world: World) -> None:
    response = world.call(
        "POST",
        "/bookings",
        world.customer,
        json={
            "category_id": world.category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "items": [{"id": "x", "name": "Tap repair", "price": 100, "quantity": 0}],
        },
    )

    assert response.status_code == 422


# --- SU-006 (T1-07): categories only through skill requests -----------------------------------


def test_provider_cannot_add_categories_through_profile_patch(world: World) -> None:
    other = world.call(
        "POST", "/admin/categories", world.admin, json={"name": "Electrician"}
    ).json()

    response = world.call(
        "PATCH", "/provider/me", world.provider, json={"category_ids": [other["id"]]}
    )

    # AR-008: the field is still accepted (Rule 7) but ignored.
    assert response.status_code in (200, 403, 422)
    names = run(world.db.users.find_one({"id": world.provider_id}))["provider_profile"][
        "category_names"
    ]
    assert names == [world.category_name]


def test_resubmit_does_not_store_unknown_category_names(world: World) -> None:
    world.call("POST", "/provider/me/resubmit", world.provider, data={"categories": ["Hacker"]})

    names = run(world.db.users.find_one({"id": world.provider_id}))["provider_profile"][
        "category_names"
    ]
    assert "Hacker" not in names


# --- SU-009 (T1-09): small fixes --------------------------------------------------------------


@xfail_until("T1-09")
def test_start_otp_locks_after_repeated_wrong_codes(world: World) -> None:
    booking = world.new_booking(status=S.ACCEPTED)
    wrong = "0000" if booking.otp != "0000" else "1111"

    for _ in range(10):
        world.call(
            "PATCH", f"/provider/bookings/{booking.id}/start", world.provider, json={"otp": wrong}
        )
    response = world.call(
        "PATCH", f"/provider/bookings/{booking.id}/start", world.provider, json={"otp": booking.otp}
    )

    assert response.status_code in (423, 429)
    assert booking.status == S.ACCEPTED.value


@xfail_until("T1-09")
def test_booking_time_in_the_past_in_ist_is_rejected(world: World) -> None:
    one_hour_ago = datetime.now(IST) - timedelta(hours=1)

    response = world.call(
        "POST",
        "/bookings",
        world.customer,
        json={
            "category_id": world.category_id,
            "locality": "Boring Road",
            "preferred_datetime": one_hour_ago.isoformat(),
        },
    )

    assert response.status_code == 422


def test_booking_time_in_the_future_in_ist_is_accepted(world: World) -> None:
    one_hour_ahead = datetime.now(IST) + timedelta(hours=1)

    response = world.call(
        "POST",
        "/bookings",
        world.customer,
        json={
            "category_id": world.category_id,
            "locality": "Boring Road",
            "preferred_datetime": one_hour_ahead.isoformat(),
        },
    )

    assert response.status_code == 201


@xfail_until("T1-09")
def test_mark_cash_paid_is_idempotent_and_does_not_rewrite_the_amount(world: World) -> None:
    booking = world.new_booking(status=S.COMPLETED)
    path = f"/provider/bookings/{booking.id}/mark-cash-paid"
    first = world.call("PATCH", path, world.provider, json={"final_amount": 450})
    assert first.status_code == 200
    history = len(booking.doc()["status_history"])

    second = world.call("PATCH", path, world.provider, json={"final_amount": 1})

    assert second.status_code == 422
    assert booking.doc()["final_amount"] == 450.0
    assert len(booking.doc()["status_history"]) == history


@xfail_until("T1-09")
def test_locality_filter_is_literal_text_not_a_regex(world: World) -> None:
    response = world.call("GET", "/providers", params={"locality": ".*"})

    assert response.status_code == 200
    assert response.json() == []


@xfail_until("T1-09")
def test_on_the_way_booking_counts_as_open_on_the_dashboard(world: World) -> None:
    world.new_booking(status=S.ON_THE_WAY)

    summary = world.call("GET", "/admin/summary", world.admin).json()

    assert summary["open_bookings"] == 1


@xfail_until("T1-09")
def test_reassigning_notifies_the_previous_provider(world: World) -> None:
    booking = world.new_booking()

    response = world.call(
        "PATCH",
        f"/admin/bookings/{booking.id}/assign",
        world.admin,
        json={"provider_id": world.other_provider_id},
    )

    assert response.status_code == 200
    assert booking.doc()["provider_id"] == world.other_provider_id
    # one notification from the first assignment, one more saying the job was taken away
    assert len(booking.notifications(user_id=world.provider_id)) >= 2


# --- Q5 (T1-09): public provider phone is hidden --------------------------------------------


@xfail_until("T1-09")
def test_public_provider_phone_is_hidden(world: World) -> None:
    run(world.db.users.update_one({"id": world.provider_id}, {"$set": {"phone": "9876500099"}}))

    listing = world.call("GET", "/providers").json()
    detail = world.call("GET", f"/providers/{world.provider_id}").json()

    assert all(p["phone"] is None for p in listing)
    assert detail["phone"] is None


def test_admin_and_owner_still_see_the_provider_phone(world: World) -> None:
    run(world.db.users.update_one({"id": world.provider_id}, {"$set": {"phone": "9876500099"}}))

    as_admin = world.call("GET", "/admin/providers", world.admin).json()
    as_owner = world.call("GET", "/provider/me", world.provider).json()

    assert {p["id"]: p["phone"] for p in as_admin}[world.provider_id] == "9876500099"
    assert as_owner["phone"] == "9876500099"


def test_booking_with_an_unavailable_provider_is_still_allowed(world: World) -> None:
    """Q2 (AR-012): availability is advisory."""
    world.call(
        "PATCH",
        "/provider/me/availability",
        world.provider,
        json={"availability_status": "UNAVAILABLE"},
    )

    response = world.call(
        "POST",
        "/bookings",
        world.customer,
        json={
            "category_id": world.category_id,
            "provider_id": world.provider_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
        },
    )

    assert response.status_code == 201
