from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.services.auth import AuthService


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_admin_token(db_session: Session) -> str:
    admin = AuthService(db_session).create_admin_user(
        name="Admin",
        email="booking-admin@example.com",
        password="strongpass123",
    )
    return create_access_token(subject=admin.id, role=admin.role)


def setup_verified_provider(client, db_session: Session) -> tuple[str, str, str, str]:
    admin_token = create_admin_token(db_session)
    category_response = client.post(
        "/api/v1/admin/categories",
        headers=auth_header(admin_token),
        json={"name": "Electrician"},
    )
    category_id = category_response.json()["id"]

    provider_response = client.post(
        "/api/v1/auth/register/provider",
        json={
            "name": "Sanjay",
            "email": "sanjay-booking@example.com",
            "password": "strongpass123",
            "category_ids": [category_id],
            "localities": ["Boring Road"],
        },
    )
    provider_body = provider_response.json()
    provider_id = provider_body["user"]["provider_profile"]["id"]
    provider_token = provider_body["access_token"]

    client.patch(
        f"/api/v1/admin/providers/{provider_id}/approve",
        headers=auth_header(admin_token),
        json={},
    )
    return category_id, provider_id, provider_token, admin_token


def test_customer_can_create_booking_without_provider_and_admin_can_assign(
    client,
    db_session,
) -> None:
    category_id, provider_id, provider_token, admin_token = setup_verified_provider(
        client,
        db_session,
    )
    customer_response = client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Riya",
            "email": "riya-booking@example.com",
            "password": "strongpass123",
        },
    )
    customer_token = customer_response.json()["access_token"]

    booking_response = client.post(
        "/api/v1/bookings",
        headers=auth_header(customer_token),
        json={
            "category_id": category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Switchboard repair needed",
        },
    )
    booking_id = booking_response.json()["id"]
    provider_before_assignment = client.get(
        "/api/v1/provider/bookings",
        headers=auth_header(provider_token),
    )
    assign_response = client.patch(
        f"/api/v1/admin/bookings/{booking_id}/assign",
        headers=auth_header(admin_token),
        json={"provider_id": provider_id},
    )
    provider_after_assignment = client.get(
        "/api/v1/provider/bookings",
        headers=auth_header(provider_token),
    )

    assert booking_response.status_code == 201
    assert booking_response.json()["status"] == "REQUESTED"
    assert booking_response.json()["provider_id"] is None
    assert booking_response.json()["provider_name"] is None
    assert booking_response.json()["payment_mode"] == "CASH_ON_SERVICE"
    assert provider_before_assignment.status_code == 200
    assert provider_before_assignment.json() == []
    assert assign_response.status_code == 200
    assert assign_response.json()["provider_id"] == provider_id
    assert provider_after_assignment.status_code == 200
    assert provider_after_assignment.json()[0]["id"] == booking_id


def test_provider_can_move_booking_through_core_lifecycle(client, db_session) -> None:
    category_id, provider_id, provider_token, admin_token = setup_verified_provider(
        client,
        db_session,
    )
    customer_response = client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Amit",
            "email": "amit-booking@example.com",
            "password": "strongpass123",
        },
    )
    customer_token = customer_response.json()["access_token"]
    booking_response = client.post(
        "/api/v1/bookings",
        headers=auth_header(customer_token),
        json={
            "category_id": category_id,
            "address": "Flat 2, Boring Road, Patna",
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Fan installation",
        },
    )
    booking_id = booking_response.json()["id"]
    client.patch(
        f"/api/v1/admin/bookings/{booking_id}/assign",
        headers=auth_header(admin_token),
        json={"provider_id": provider_id},
    )

    accept_response = client.patch(
        f"/api/v1/provider/bookings/{booking_id}/accept",
        headers=auth_header(provider_token),
        json={},
    )
    start_response = client.patch(
        f"/api/v1/provider/bookings/{booking_id}/start",
        headers=auth_header(provider_token),
        json={},
    )
    complete_response = client.patch(
        f"/api/v1/provider/bookings/{booking_id}/complete",
        headers=auth_header(provider_token),
        json={"final_amount": 350},
    )
    paid_response = client.patch(
        f"/api/v1/provider/bookings/{booking_id}/mark-cash-paid",
        headers=auth_header(provider_token),
        json={},
    )

    assert accept_response.status_code == 200
    assert accept_response.json()["status"] == "ACCEPTED"
    assert start_response.status_code == 200
    assert start_response.json()["status"] == "IN_PROGRESS"
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "COMPLETED"
    assert complete_response.json()["final_amount"] == 350.0
    assert paid_response.status_code == 200
    assert paid_response.json()["payment_status"] == "PAID_CASH"


def test_customer_can_review_completed_booking_once(client, db_session) -> None:
    category_id, provider_id, provider_token, admin_token = setup_verified_provider(
        client,
        db_session,
    )
    customer_response = client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Neha",
            "email": "neha-review@example.com",
            "phone": "9999991111",
            "password": "strongpass123",
        },
    )
    customer_token = customer_response.json()["access_token"]
    booking_response = client.post(
        "/api/v1/bookings",
        headers=auth_header(customer_token),
        json={
            "category_id": category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Light repair",
        },
    )
    booking_id = booking_response.json()["id"]

    client.patch(
        f"/api/v1/admin/bookings/{booking_id}/assign",
        headers=auth_header(admin_token),
        json={"provider_id": provider_id},
    )
    client.patch(
        f"/api/v1/provider/bookings/{booking_id}/accept",
        headers=auth_header(provider_token),
        json={},
    )
    client.patch(
        f"/api/v1/provider/bookings/{booking_id}/start",
        headers=auth_header(provider_token),
        json={},
    )
    client.patch(
        f"/api/v1/provider/bookings/{booking_id}/complete",
        headers=auth_header(provider_token),
        json={},
    )

    review_response = client.post(
        f"/api/v1/bookings/{booking_id}/review",
        headers=auth_header(customer_token),
        json={"rating": 5, "comment": "Very professional"},
    )
    duplicate_response = client.post(
        f"/api/v1/bookings/{booking_id}/review",
        headers=auth_header(customer_token),
        json={"rating": 4},
    )
    reviews_response = client.get(f"/api/v1/providers/{provider_id}/reviews")
    provider_response = client.get(f"/api/v1/providers/{provider_id}")

    assert review_response.status_code == 201
    assert review_response.json()["rating"] == 5
    assert duplicate_response.status_code == 409
    assert reviews_response.status_code == 200
    assert reviews_response.json()[0]["comment"] == "Very professional"
    assert provider_response.json()["average_rating"] == 5.0
    assert provider_response.json()["total_reviews"] == 1


def test_admin_summary_customers_notifications_and_booking_status_update(
    client,
    db_session,
) -> None:
    category_id, _provider_id, _provider_token, admin_token = setup_verified_provider(
        client,
        db_session,
    )
    customer_response = client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Pooja",
            "email": "pooja-admin@example.com",
            "password": "strongpass123",
            "default_locality": "Kankarbagh",
        },
    )
    customer_token = customer_response.json()["access_token"]
    booking_response = client.post(
        "/api/v1/bookings",
        headers=auth_header(customer_token),
        json={
            "category_id": category_id,
            "locality": "Kankarbagh",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Socket repair",
        },
    )
    booking_id = booking_response.json()["id"]

    admin_notifications = client.get(
        "/api/v1/notifications",
        headers=auth_header(admin_token),
    )
    summary_response = client.get("/api/v1/admin/summary", headers=auth_header(admin_token))
    customers_response = client.get("/api/v1/admin/customers", headers=auth_header(admin_token))
    filtered_response = client.get(
        "/api/v1/admin/bookings?status=REQUESTED",
        headers=auth_header(admin_token),
    )
    cancelled_response = client.patch(
        f"/api/v1/admin/bookings/{booking_id}/status",
        headers=auth_header(admin_token),
        json={"status": "CANCELLED_BY_ADMIN"},
    )
    customer_notifications = client.get(
        "/api/v1/notifications",
        headers=auth_header(customer_token),
    )

    assert admin_notifications.status_code == 200
    assert any(
        item["event_type"] == "BOOKING_REQUESTED" for item in admin_notifications.json()
    )
    assert summary_response.status_code == 200
    assert summary_response.json()["total_customers"] == 1
    assert summary_response.json()["total_bookings"] == 1
    assert customers_response.status_code == 200
    assert customers_response.json()[0]["default_locality"] == "Kankarbagh"
    assert filtered_response.status_code == 200
    assert filtered_response.json()[0]["id"] == booking_id
    assert cancelled_response.status_code == 200
    assert cancelled_response.json()["status"] == "CANCELLED_BY_ADMIN"
    assert any(
        item["event_type"] == "BOOKING_STATUS_CHANGED"
        for item in customer_notifications.json()
    )


def test_admin_can_hide_review_and_rating_recalculates(client, db_session) -> None:
    category_id, provider_id, provider_token, admin_token = setup_verified_provider(
        client,
        db_session,
    )
    customer_response = client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Maya",
            "email": "maya-review@example.com",
            "password": "strongpass123",
        },
    )
    customer_token = customer_response.json()["access_token"]
    booking_response = client.post(
        "/api/v1/bookings",
        headers=auth_header(customer_token),
        json={
            "category_id": category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Wiring check",
        },
    )
    booking_id = booking_response.json()["id"]

    client.patch(
        f"/api/v1/admin/bookings/{booking_id}/assign",
        headers=auth_header(admin_token),
        json={"provider_id": provider_id},
    )
    client.patch(
        f"/api/v1/provider/bookings/{booking_id}/accept",
        headers=auth_header(provider_token),
        json={},
    )
    client.patch(
        f"/api/v1/provider/bookings/{booking_id}/start",
        headers=auth_header(provider_token),
        json={},
    )
    client.patch(
        f"/api/v1/provider/bookings/{booking_id}/complete",
        headers=auth_header(provider_token),
        json={},
    )
    review_response = client.post(
        f"/api/v1/bookings/{booking_id}/review",
        headers=auth_header(customer_token),
        json={"rating": 4, "comment": "Good service"},
    )
    review_id = review_response.json()["id"]

    admin_reviews_response = client.get(
        "/api/v1/admin/reviews",
        headers=auth_header(admin_token),
    )
    hide_response = client.patch(
        f"/api/v1/admin/reviews/{review_id}/hide",
        headers=auth_header(admin_token),
        json={},
    )
    public_reviews_response = client.get(f"/api/v1/providers/{provider_id}/reviews")
    provider_response = client.get(f"/api/v1/providers/{provider_id}")

    assert admin_reviews_response.status_code == 200
    assert admin_reviews_response.json()[0]["id"] == review_id
    assert hide_response.status_code == 200
    assert hide_response.json()["status"] == "HIDDEN_BY_ADMIN"
    assert public_reviews_response.status_code == 200
    assert public_reviews_response.json() == []
    assert provider_response.json()["average_rating"] == 0.0
    assert provider_response.json()["total_reviews"] == 0
