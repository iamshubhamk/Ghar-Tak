"""Shared setup for the T1-16 lifecycle and auth API tests (docs/qa/test-plan.md §1-2).

Support owns this module and the `test_lifecycle_*.py` files; `conftest.py` stays with backend.
Tests that describe behaviour a Phase 1 ticket has not delivered yet are marked with
`xfail_until("T1-xx")` (strict: when the ticket lands the mark must be removed, or the run fails).
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

API = "/api/v1"
PASSWORD = "strongpass123"


def xfail_until(ticket: str) -> pytest.MarkDecorator:
    return pytest.mark.xfail(strict=True, reason=f"{ticket} not delivered yet")


def bearer(token: str | None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"} if token else {}


@dataclass
class Booking:
    world: "World"
    id: str
    otp: str

    def doc(self) -> dict[str, Any]:
        return run(self.world.db.bookings.find_one({"id": self.id}))

    @property
    def status(self) -> str:
        return self.doc()["status"]

    def set_status(self, status: S) -> None:
        run(self.world.db.bookings.update_one({"id": self.id}, {"$set": {"status": status.value}}))

    def notifications(self, **match: Any) -> list[dict[str, Any]]:
        query = {"related_entity_id": self.id, **match}
        return run(self.world.db.notifications.find(query).to_list(None))


@dataclass
class World:
    client: TestClient
    db: Any
    admin_id: str
    admin: str
    customer_id: str
    customer: str
    other_customer: str
    provider_id: str
    provider: str
    other_provider_id: str
    other_provider: str
    category_id: str
    category_name: str

    def call(self, method: str, path: str, token: str | None = None, **kwargs: Any):
        return self.client.request(method, f"{API}{path}", headers=bearer(token), **kwargs)

    def register_provider(self, email: str, approve: bool = True) -> tuple[str, str]:
        body = self.call(
            "POST",
            "/auth/register/provider",
            json={
                "name": "Extra Provider",
                "email": email,
                "password": PASSWORD,
                "category_ids": [self.category_id],
                "localities": ["Boring Road"],
            },
        ).json()
        if approve:
            self.call(
                "PATCH", f"/admin/providers/{body['user']['id']}/approve", self.admin, json={}
            )
        return body["user"]["id"], body["access_token"]

    def new_booking(
        self,
        status: S = S.REQUESTED,
        assigned: bool = True,
        customer: str | None = None,
        **overrides: Any,
    ) -> Booking:
        payload = {
            "category_id": self.category_id,
            "locality": "Boring Road",
            "preferred_datetime": (datetime.now(UTC) + timedelta(days=1)).isoformat(),
            "issue_description": "Leaking tap",
            **overrides,
        }
        response = self.call("POST", "/bookings", customer or self.customer, json=payload)
        assert response.status_code == 201, response.text
        created = response.json()
        booking = Booking(self, created["id"], created["otp"])
        if assigned:
            assign = self.call(
                "PATCH",
                f"/admin/bookings/{booking.id}/assign",
                self.admin,
                json={"provider_id": self.provider_id},
            )
            assert assign.status_code == 200, assign.text
        if status != S.REQUESTED:
            booking.set_status(status)
        return booking

    def set_user_active(self, user_id: str, active: bool) -> None:
        run(self.db.users.update_one({"id": user_id}, {"$set": {"is_active": active}}))

    def set_verification(self, provider_id: str, status: str) -> None:
        run(
            self.db.users.update_one(
                {"id": provider_id},
                {"$set": {"provider_profile.verification_status": status}},
            )
        )


@pytest.fixture
def world(client: TestClient, db: Any) -> World:
    admin = run(
        AuthService(db).create_admin_user(
            name="Admin", email="lifecycle-admin@example.com", password=PASSWORD
        )
    )
    admin_token = create_access_token(subject=admin["id"], role=admin["role"])
    category = client.post(
        f"{API}/admin/categories", headers=bearer(admin_token), json={"name": "Plumbing"}
    ).json()

    def customer(email: str) -> tuple[str, str]:
        body = client.post(
            f"{API}/auth/register/customer",
            json={"name": "Customer", "email": email, "password": PASSWORD},
        ).json()
        return body["user"]["id"], body["access_token"]

    customer_id, customer_token = customer("lifecycle-c1@example.com")
    _, other_customer_token = customer("lifecycle-c2@example.com")
    result = World(
        client=client,
        db=db,
        admin_id=admin["id"],
        admin=admin_token,
        customer_id=customer_id,
        customer=customer_token,
        other_customer=other_customer_token,
        provider_id="",
        provider="",
        other_provider_id="",
        other_provider="",
        category_id=category["id"],
        category_name=category["name"],
    )
    result.provider_id, result.provider = result.register_provider("lifecycle-p1@example.com")
    result.other_provider_id, result.other_provider = result.register_provider(
        "lifecycle-p2@example.com"
    )
    return result
