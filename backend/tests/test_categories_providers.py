from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.services.auth import AuthService


def create_admin_token(db_session: Session) -> str:
    admin = AuthService(db_session).create_admin_user(
        name="Admin",
        email="admin@example.com",
        password="strongpass123",
    )
    return create_access_token(subject=admin.id, role=admin.role)


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_admin_can_create_and_public_can_list_active_categories(client, db_session) -> None:
    admin_token = create_admin_token(db_session)

    create_response = client.post(
        "/api/v1/admin/categories",
        headers=auth_header(admin_token),
        json={
            "name": "Electrician",
            "description": "Switches, wiring, and repair work",
            "display_order": 1,
        },
    )

    list_response = client.get("/api/v1/categories")

    assert create_response.status_code == 201
    assert create_response.json()["slug"] == "electrician"
    assert list_response.status_code == 200
    assert list_response.json()[0]["name"] == "Electrician"
    assert list_response.json()[0]["price_label"] == "Starts at INR 199"
    assert {category["name"] for category in list_response.json()} >= {
        "Electrician",
        "Plumber",
        "Carpenter",
        "Painter",
        "AC Repair",
        "Appliance Repair",
        "House Cleaning",
        "Driver",
        "Tutor",
        "Event Staff",
        "Other Service",
    }


def test_category_admin_requires_admin_role(client) -> None:
    response = client.post(
        "/api/v1/admin/categories",
        json={"name": "Plumber"},
    )

    assert response.status_code == 401


def test_disabled_category_is_hidden_from_public_list(client, db_session) -> None:
    admin_token = create_admin_token(db_session)

    category_response = client.post(
        "/api/v1/admin/categories",
        headers=auth_header(admin_token),
        json={"name": "Carpenter"},
    )
    category_id = category_response.json()["id"]

    client.patch(
        f"/api/v1/admin/categories/{category_id}/status",
        headers=auth_header(admin_token),
        json={"is_active": False},
    )

    response = client.get("/api/v1/categories")

    assert response.status_code == 200
    category_names = {category["name"] for category in response.json()}
    assert "Carpenter" not in category_names
    assert "Electrician" in category_names


def test_provider_can_update_profile_and_admin_can_approve(client, db_session) -> None:
    admin_token = create_admin_token(db_session)
    category_response = client.post(
        "/api/v1/admin/categories",
        headers=auth_header(admin_token),
        json={"name": "AC Repair"},
    )
    category_id = category_response.json()["id"]

    provider_response = client.post(
        "/api/v1/auth/register/provider",
        json={
            "name": "Sanjay",
            "phone": "9876543210",
            "password": "strongpass123",
            "category_ids": [category_id],
            "localities": ["Rajendra Nagar", "Kankarbagh"],
        },
    )
    provider_body = provider_response.json()
    provider_token = provider_body["access_token"]
    provider_id = provider_body["user"]["provider_profile"]["id"]

    update_response = client.patch(
        "/api/v1/provider/me",
        headers=auth_header(provider_token),
        json={
            "bio": "AC technician available across central Patna",
            "price_note": "Inspection starts from INR 199",
            "localities": ["Boring Road"],
        },
    )
    approve_response = client.patch(
        f"/api/v1/admin/providers/{provider_id}/approve",
        headers=auth_header(admin_token),
        json={},
    )

    assert provider_response.status_code == 201
    assert update_response.status_code == 200
    assert update_response.json()["localities"] == ["Boring Road"]
    assert approve_response.status_code == 200
    assert approve_response.json()["verification_status"] == "VERIFIED"
    assert approve_response.json()["is_public"] is True


def test_provider_can_update_availability(client) -> None:
    provider_response = client.post(
        "/api/v1/auth/register/provider",
        json={
            "name": "Ravi",
            "email": "ravi@example.com",
            "password": "strongpass123",
        },
    )
    provider_token = provider_response.json()["access_token"]

    response = client.patch(
        "/api/v1/provider/me/availability",
        headers=auth_header(provider_token),
        json={"availability_status": "AVAILABLE"},
    )

    assert response.status_code == 200
    assert response.json()["availability_status"] == "AVAILABLE"
