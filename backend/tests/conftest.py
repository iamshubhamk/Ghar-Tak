"""Shared fixtures.

Two modes, same tests:
  * default: an in-memory MongoDB (mongomock), no services needed;
  * TEST_MONGODB_URL=mongodb://localhost:27017/<any> : a REAL MongoDB. The session gets one
    throwaway database (`ghartak_t_<random>`) on that server, emptied before each test and dropped
    at the end. Only local
    addresses are accepted, so this can never be pointed at production.

Real mode needs care with event loops: a Motor client belongs to the loop it is created on.
  * test code talks to the database through ONE persistent loop (`LOOP`, via `run()`);
  * the API under TestClient runs on its own loop per request, so the `get_db` override creates a
    short-lived client inside that loop.
"""

import asyncio
import os
import uuid
from collections.abc import AsyncGenerator, Callable, Generator
from typing import Any
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.security import create_access_token, password_context
from app.db.init_db import create_database_tables
from app.db.session import get_db
from app.main import app
from app.services.auth import AuthService

REAL_URL = os.environ.get("TEST_MONGODB_URL") or None
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "mongo"}


def _check_real_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "mongodb" or parsed.hostname not in LOCAL_HOSTS:
        raise RuntimeError(
            "TEST_MONGODB_URL must be a plain mongodb:// URL on localhost (or the compose "
            "service 'mongo'). Refusing to run tests against anything else."
        )


def database_url(name: str) -> str:
    """TEST_MONGODB_URL with the database name replaced by `name`."""
    assert REAL_URL
    base = REAL_URL.split("?", 1)[0].rsplit("/", 1)[0]
    return f"{base}/{name}"


LOOP: asyncio.AbstractEventLoop | None = None
if REAL_URL:
    _check_real_url(REAL_URL)
    LOOP = asyncio.new_event_loop()


async def _await(awaitable: Any) -> Any:
    return await awaitable


def run(awaitable: Any) -> Any:
    """Run a database call (or coroutine) from sync test code."""
    if LOOP is not None:
        return LOOP.run_until_complete(_await(awaitable))
    return asyncio.run(awaitable)


@pytest.fixture(autouse=True, scope="session")
def fast_password_hashing() -> None:
    password_context.update(bcrypt__rounds=4)  # keeps bcrypt cheap; behaviour is unchanged


@pytest.fixture(scope="session")
def _real_database() -> Generator[AsyncIOMotorDatabase | None, None, None]:
    """One throwaway database for the whole session (indexes built once), real mode only."""
    if not REAL_URL:
        yield None
        return
    name = f"ghartak_t_{uuid.uuid4().hex[:10]}"
    client = AsyncIOMotorClient(database_url(name), serverSelectionTimeoutMS=8000, io_loop=LOOP)
    database = client[name]
    database.test_url = database_url(name)  # lets the API fixture reach the same database
    run(create_database_tables(database))
    yield database
    run(client.drop_database(name))
    client.close()


@pytest.fixture
def db(_real_database: AsyncIOMotorDatabase | None) -> Generator[AsyncIOMotorDatabase, None, None]:
    """An empty database per test: in-memory (mongomock), or the session database on a real
    MongoDB with every collection emptied first (indexes are kept, so index behaviour is real)."""
    if _real_database is not None:
        for collection in run(_real_database.list_collection_names()):
            run(_real_database[collection].delete_many({}))
        yield _real_database
        return
    client = AsyncMongoMockClient()
    database = client["ghartak_test"]
    run(create_database_tables(database))
    yield database
    client.close()


@pytest.fixture
def client(db: AsyncIOMotorDatabase) -> Generator[TestClient, None, None]:
    if REAL_URL:
        url, name = db.test_url, db.name

        async def override_get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
            api_client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=8000)
            try:
                yield api_client[name]
            finally:
                api_client.close()

    else:

        async def override_get_db() -> AsyncIOMotorDatabase:
            return db

    app.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager on purpose: skips the lifespan (which would connect).
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
