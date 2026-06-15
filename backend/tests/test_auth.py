from fastapi.testclient import TestClient


def test_customer_registration_returns_token_and_user(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register/customer",
        json={
            "name": "Riya",
            "email": "riya@example.com",
            "password": "strongpass123",
            "default_locality": "Boring Road",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "CUSTOMER"
    assert body["user"]["customer_profile"]["default_locality"] == "Boring Road"


def test_provider_registration_defaults_to_pending_verification(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register/provider",
        json={
            "name": "Sanjay",
            "phone": "9876543210",
            "password": "strongpass123",
            "bio": "Electrician in Rajendra Nagar",
            "experience_years": 7,
        },
    )

    assert response.status_code == 201
    provider_profile = response.json()["user"]["provider_profile"]
    assert provider_profile["verification_status"] == "PENDING_VERIFICATION"
    assert provider_profile["availability_status"] == "UNAVAILABLE"
    assert provider_profile["is_public"] is False


def test_duplicate_contact_is_blocked(client: TestClient) -> None:
    payload = {
        "name": "Amit",
        "email": "amit@example.com",
        "password": "strongpass123",
    }

    first_response = client.post("/api/v1/auth/register/customer", json=payload)
    duplicate_response = client.post("/api/v1/auth/register/customer", json=payload)

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["detail"]["error"]["code"] == "DUPLICATE_ACCOUNT"


def test_login_and_me(client: TestClient) -> None:
    payload = {
        "name": "Neha",
        "email": "neha@example.com",
        "password": "strongpass123",
    }
    client.post("/api/v1/auth/register/customer", json=payload)

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "neha@example.com",
            "password": "strongpass123",
        },
    )
    token = login_response.json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert login_response.status_code == 200
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "neha@example.com"


def test_invalid_login_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "missing@example.com",
            "password": "wrong",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "INVALID_CREDENTIALS"
