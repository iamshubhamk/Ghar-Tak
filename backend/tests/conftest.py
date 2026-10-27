import asyncio
import os
from collections.abc import Callable, Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.security import create_access_token, password_context
from app.db.init_db import create_database_tables
from app.db.session import get_db
from app.main import app
from app.services.auth import AuthService


@pytest.fixture(autouse=True, scope="session")
def fast_password_hashing() -> None:
    password_context.update(bcrypt__rounds=4)  # keeps bcrypt cheap; behaviour is unchanged


def run(coro: Any) -> Any:
    """Run a coroutine from sync test code (used for seeding and direct DB checks)."""
    return asyncio.run(coro)


@pytest.fixture
def db() -> Generator[AsyncIOMotorDatabase, None, None]:
    """Fresh database per test: in-memory mongomock, or a real one if TEST_MONGODB_URL is set."""
    real_url = os.environ.get("TEST_MONGODB_URL")
    if real_url:
        client = AsyncIOMotorClient(real_url)
        database = client.get_default_database()
    else:
        client = AsyncMongoMockClient()
        database = client["ghartak_test"]
    run(create_database_tables(database))
    yield database
    if real_url:
        run(client.drop_database(database.name))
    client.close()


@pytest.fixture
def client(db: AsyncIOMotorDatabase) -> Generator[TestClient, None, None]:
    async def override_get_db() -> AsyncIOMotorDatabase:
        return db

    app.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager on purpose: skips the lifespan (which would hit the real DB).
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def auth_header() -> Callable[[str], dict[str, str]]:
    return lambda token: {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_token(db: AsyncIOMotorDatabase) -> str:
    admin = run(
        AuthService(db).create_admin_user(
            name="Admin", email="admin@example.com", password="strongpass123"
        )
    )
    return create_access_token(subject=admin["id"], role=admin["role"])
