"""SU-016: unique contact indexes on a REAL MongoDB. Skipped unless TEST_MONGODB_URL is set.

mongomock cannot show this bug: a sparse unique index still indexes an explicit null on real
MongoDB. Run locally, for example:
    docker run -d --name ghartak-test-mongo -p 127.0.0.1:27018:27017 mongo:7
    export TEST_MONGODB_URL=mongodb://127.0.0.1:27018/ghartak_test
    pytest tests/test_contact_indexes_real_mongo.py
Every test uses its own throwaway database and drops it afterwards.
"""

import asyncio
import logging
import os
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

from app.db.init_db import CONTACT_INDEXES, create_database_tables
from app.db.session import get_db
from app.main import app
from scripts.migrate_contact_indexes import run as migrate

# Motor binds a client to the event loop it first runs on, so these tests share one loop
# (the mongomock tests can use a throwaway loop per call; a real client cannot).
LOOP = asyncio.new_event_loop()


async def _await(awaitable):
    return await awaitable


def run(awaitable):
    return LOOP.run_until_complete(_await(awaitable))


URL = os.environ.get("TEST_MONGODB_URL")
pytestmark = pytest.mark.skipif(not URL, reason="needs a real MongoDB: set TEST_MONGODB_URL")


def database_url(name: str) -> str:
    assert URL and "?" not in URL, "use a plain mongodb://host:port/db TEST_MONGODB_URL"
    return URL.rsplit("/", 1)[0] + "/" + name


@pytest.fixture
def real_db() -> Generator:
    name = f"ghartak_idx_{uuid.uuid4().hex[:10]}"
    client = AsyncIOMotorClient(
        database_url(name), serverSelectionTimeoutMS=8000, io_loop=LOOP
    )
    database = client[name]
    database.url = database_url(name)  # for the migration script
    yield database
    run(client.drop_database(name))
    client.close()


def make_old_indexes(db) -> None:
    """What production has today: unique + sparse, named email_1 / phone_1."""
    run(db.users.create_index([("email", 1)], unique=True, sparse=True))
    run(db.users.create_index([("phone", 1)], unique=True, sparse=True))


def user(email=None, phone=None, **extra) -> dict:
    return {"id": uuid.uuid4().hex, "email": email, "phone": phone, "name": "T", **extra}


def index_names(db) -> set[str]:
    return set(run(db.users.index_information()))


@pytest.fixture
def api(real_db):
    async def override():
        # The API runs on the TestClient's own loop, so it needs a client created there.
        return AsyncIOMotorClient(real_db.url)[real_db.name]

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


# ---------- the bug, and the fix ----------


def test_old_sparse_index_really_fails_on_a_second_null(real_db) -> None:
    make_old_indexes(real_db)
    run(real_db.users.insert_one(user(email="a@example.com", phone=None)))

    with pytest.raises(DuplicateKeyError):
        run(real_db.users.insert_one(user(email="b@example.com", phone=None)))


def test_two_accounts_without_a_phone_can_register(real_db, api) -> None:
    run(create_database_tables(real_db))

    first = api.post(
        "/api/v1/auth/register/customer",
        json={"name": "Asha Devi", "email": "asha@example.com", "password": "strongpass123"},
    )
    second = api.post(
        "/api/v1/auth/register/customer",
        json={"name": "Bina Devi", "email": "bina@example.com", "password": "strongpass123"},
    )

    assert first.status_code == 201 and second.status_code == 201
    assert run(real_db.users.count_documents({"phone": None})) == 2


def test_two_accounts_without_an_email_can_register(real_db, api) -> None:
    run(create_database_tables(real_db))

    first = api.post(
        "/api/v1/auth/register/customer",
        json={"name": "Asha Devi", "phone": "9876500011", "password": "strongpass123"},
    )
    second = api.post(
        "/api/v1/auth/register/customer",
        json={"name": "Bina Devi", "phone": "9876500012", "password": "strongpass123"},
    )

    assert first.status_code == 201 and second.status_code == 201
    assert run(real_db.users.count_documents({"email": None})) == 2


@pytest.mark.parametrize("field", ["email", "phone"])
def test_duplicate_real_values_are_still_rejected_by_the_database(real_db, field) -> None:
    run(create_database_tables(real_db))
    value = "dup@example.com" if field == "email" else "9876500099"
    run(real_db.users.insert_one(user(**{field: value})))

    with pytest.raises(DuplicateKeyError):
        run(real_db.users.insert_one(user(**{field: value})))


def test_duplicate_email_is_a_409_through_the_api(real_db, api) -> None:
    run(create_database_tables(real_db))
    body = {"name": "Asha Devi", "email": "same@example.com", "password": "strongpass123"}

    first = api.post("/api/v1/auth/register/customer", json=body)
    second = api.post("/api/v1/auth/register/customer", json=body)

    assert first.status_code == 201 and second.status_code == 409


def test_fresh_database_gets_only_the_partial_indexes(real_db) -> None:
    run(create_database_tables(real_db))

    names = index_names(real_db)
    info = run(real_db.users.index_information())
    assert set(CONTACT_INDEXES.values()) <= names
    assert "email_1" not in names and "phone_1" not in names
    assert info[CONTACT_INDEXES["email"]]["partialFilterExpression"] == {
        "email": {"$type": "string"}
    }


# ---------- startup safety ----------


def test_startup_with_old_indexes_does_not_crash_or_drop_anything(real_db, caplog) -> None:
    make_old_indexes(real_db)
    before = index_names(real_db)

    with caplog.at_level(logging.WARNING, logger="ghartak.db"):
        run(create_database_tables(real_db))  # must not raise

    after = index_names(real_db)
    assert before <= after, "startup must not drop an index"
    assert {"email_1", "phone_1"} <= after
    assert "migrate_contact_indexes" in caplog.text


def test_startup_survives_a_conflicting_index_and_keeps_going(real_db, caplog) -> None:
    run(
        real_db.users.create_index(
            [("email", 1)], name=CONTACT_INDEXES["email"], unique=True, sparse=True
        )
    )

    with caplog.at_level(logging.WARNING, logger="ghartak.db"):
        run(create_database_tables(real_db))  # same name, different options: must not raise

    assert "Could not create index" in caplog.text
    assert CONTACT_INDEXES["phone"] in index_names(real_db)  # later indexes were still created
    assert "status_1" in set(run(real_db.bookings.index_information()))


# ---------- the migration script ----------


def test_dry_run_reports_and_changes_nothing(real_db, capsys) -> None:
    make_old_indexes(real_db)
    run(real_db.users.insert_many([user(email="a@example.com"), user(phone="9876500001")]))
    docs_before = run(real_db.users.find({}, {"_id": 0}).to_list(None))
    indexes_before = run(real_db.users.index_information())

    code = run(migrate(real_db.url, apply=False))

    out = capsys.readouterr().out
    assert code == 0
    assert "Dry run only" in out and "email_1" in out
    assert "explicit null" in out and "duplicate values: 0" in out
    assert run(real_db.users.index_information()) == indexes_before
    assert run(real_db.users.find({}, {"_id": 0}).to_list(None)) == docs_before


def test_dry_run_lists_duplicates_and_refuses_to_apply(real_db, capsys) -> None:
    run(real_db.users.insert_many([user(email="dup@example.com"), user(email="dup@example.com")]))

    dry = run(migrate(real_db.url, apply=False))
    applied = run(migrate(real_db.url, apply=True))

    out = capsys.readouterr().out
    assert dry == 1 and applied == 1
    assert "DUPLICATE email='dup@example.com'" in out and "REFUSING" in out
    assert CONTACT_INDEXES["email"] not in index_names(real_db)  # nothing was built
    assert run(real_db.users.count_documents({})) == 2  # no user data touched


def test_apply_switches_indexes_and_unblocks_second_null(real_db, capsys) -> None:
    make_old_indexes(real_db)
    run(real_db.users.insert_one(user(email="a@example.com", phone=None)))
    with pytest.raises(DuplicateKeyError):
        run(real_db.users.insert_one(user(email="b@example.com", phone=None)))

    code = run(migrate(real_db.url, apply=True))

    names = index_names(real_db)
    assert code == 0
    assert {"email_1", "phone_1"}.isdisjoint(names)
    assert set(CONTACT_INDEXES.values()) <= names
    run(real_db.users.insert_one(user(email="b@example.com", phone=None)))  # now fine
    with pytest.raises(DuplicateKeyError):
        run(real_db.users.insert_one(user(email="b@example.com", phone=None)))  # still unique


def test_apply_is_repeatable_and_never_edits_users(real_db, capsys) -> None:
    make_old_indexes(real_db)
    run(real_db.users.insert_many([user(email="a@example.com"), user(phone="9876500002")]))
    docs_before = run(real_db.users.find({}, {"_id": 0}).to_list(None))

    first = run(migrate(real_db.url, apply=True))
    second = run(migrate(real_db.url, apply=True))

    assert first == 0 and second == 0
    assert "Nothing to do" in capsys.readouterr().out
    assert run(real_db.users.find({}, {"_id": 0}).to_list(None)) == docs_before


def test_apply_refuses_when_a_wrong_index_already_has_the_new_name(real_db, capsys) -> None:
    make_old_indexes(real_db)
    # a conflicting index already occupies the new name, so the build fails
    run(
        real_db.users.create_index(
            [("zzz", 1)], name=CONTACT_INDEXES["email"], unique=True
        )
    )

    code = run(migrate(real_db.url, apply=True))

    assert code == 1
    assert "email_1" in index_names(real_db)  # uniqueness is still enforced
    assert "CONFLICT" in capsys.readouterr().out


def test_unreachable_database_exits_with_2(capsys) -> None:
    assert run(migrate("mongodb://127.0.0.1:1/nope", apply=False)) == 2
