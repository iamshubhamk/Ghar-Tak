"""Replace the old sparse unique email/phone indexes on `users` (SU-016). Dry run by default.

Why: the old indexes (`email_1`, `phone_1`) are unique + sparse, but sparse still indexes an
explicit null, which registration stores for a missing email or phone. So a second account without
a phone (or email) fails with a duplicate key error. The replacements (`users_email_unique_string`,
`users_phone_unique_string`) are partial: they only index real strings.

Run from backend/ (this script never changes user data):
    python -m scripts.migrate_contact_indexes               # DRY RUN: read-only report
    python -m scripts.migrate_contact_indexes --apply       # do the switch (human approval first)
    python -m scripts.migrate_contact_indexes --url mongodb://127.0.0.1:27018/ghartak_test

Order of an --apply run, which keeps uniqueness enforced the whole time:
  1. stop if any non-null email/phone value appears on more than one account;
  2. build the new partial unique index (the old one is still enforcing);
  3. only then drop the old index;
  4. check the result.
Safe to re-run. If step 2 fails, nothing is dropped. Gap to know about: between step 1 and the
end of step 2 a duplicate created by a concurrent signup would make the build fail (the old
index would normally have blocked it as well); the script then leaves the old index in place
and exits 1.

Exit codes: 0 ok / nothing to do, 1 refused or failed, 2 cannot connect.
"""

import argparse
import asyncio
import sys
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings
from app.db.init_db import (
    CONTACT_INDEXES,
    contact_index_options,
    is_expected_contact_index,
    is_old_contact_index,
)

FIELDS = ("email", "phone")


async def find_duplicates(db: AsyncIOMotorDatabase, field: str) -> list[dict[str, Any]]:
    pipeline = [
        {"$match": {field: {"$type": "string"}}},
        {"$group": {"_id": f"${field}", "count": {"$sum": 1}, "user_ids": {"$push": "$id"}}},
        {"$match": {"count": {"$gt": 1}}},
        {"$sort": {"count": -1}},
    ]
    return await db.users.aggregate(pipeline).to_list(None)


async def gather(db: AsyncIOMotorDatabase) -> dict[str, Any]:
    indexes = await db.users.index_information()
    report: dict[str, Any] = {
        "indexes": indexes,
        "total_users": await db.users.count_documents({}),
        "fields": {},
    }
    for field in FIELDS:
        missing = await db.users.count_documents({field: {"$exists": False}})
        null_or_missing = await db.users.count_documents({field: None})
        report["fields"][field] = {
            "missing": missing,
            "null": null_or_missing - missing,
            "string": await db.users.count_documents({field: {"$type": "string"}}),
            "duplicates": await find_duplicates(db, field),
            "old_index": next(
                (
                    name
                    for name, info in indexes.items()
                    if info.get("key") == [(field, 1)] and is_old_contact_index(field, info)
                ),
                None,
            ),
            "new_index_present": CONTACT_INDEXES[field] in indexes
            and is_expected_contact_index(field, indexes[CONTACT_INDEXES[field]]),
            # same name, different definition: never trust it, never drop the old one around it
            "new_index_conflict": CONTACT_INDEXES[field] in indexes
            and not is_expected_contact_index(field, indexes[CONTACT_INDEXES[field]]),
        }
    return report


def print_report(report: dict[str, Any], url_label: str, apply: bool) -> None:
    print(f"Database: {url_label}")
    print(f"Users: {report['total_users']}")
    print("Indexes on users:")
    for name, info in report["indexes"].items():
        extras = {k: v for k, v in info.items() if k not in ("v", "key")}
        print(f"  - {name}: key={info.get('key')} {extras}")
    for field in FIELDS:
        data = report["fields"][field]
        print(
            f"{field}: {data['string']} with a value, {data['null']} explicit null, "
            f"{data['missing']} missing; duplicate values: {len(data['duplicates'])}"
        )
        for dup in data["duplicates"][:20]:
            print(f"    DUPLICATE {field}={dup['_id']!r} on accounts {dup['user_ids']}")
        old = data["old_index"] or "none"
        new = "present" if data["new_index_present"] else "missing"
        if data["new_index_conflict"]:
            new = f"CONFLICT: {CONTACT_INDEXES[field]} exists with a different definition"
        print(f"    old unique index: {old}; new partial index: {new}")


def plan_steps(report: dict[str, Any]) -> list[str]:
    steps: list[str] = []
    for field in FIELDS:
        data = report["fields"][field]
        if not data["new_index_present"]:
            steps.append(f"create index {CONTACT_INDEXES[field]} (unique, only string {field}s)")
        if data["old_index"]:
            steps.append(f"drop old index {data['old_index']} (after the new one exists)")
    return steps


async def apply_changes(db: AsyncIOMotorDatabase, report: dict[str, Any]) -> bool:
    for field in FIELDS:
        data = report["fields"][field]
        if not data["new_index_present"]:
            print(f"creating {CONTACT_INDEXES[field]} ...")
            options = contact_index_options(field)
            try:
                await db.users.create_index([(field, 1)], **options)
            except Exception as error:  # noqa: BLE001
                print(f"FAILED to create {options['name']}: {error}")
                print("Nothing was dropped. The old index is still enforcing uniqueness.")
                return False
        if data["old_index"]:
            print(f"dropping old index {data['old_index']} ...")
            await db.users.drop_index(data["old_index"])
    return True


async def run(url: str | None, apply: bool) -> int:
    target = url or get_settings().mongodb_url
    client = AsyncIOMotorClient(target, serverSelectionTimeoutMS=8000)
    try:
        db = client.get_default_database()
        await client.admin.command("ping")
    except Exception as error:  # noqa: BLE001
        print(f"Cannot connect to the database: {error}", file=sys.stderr)
        return 2

    label = f"{db.name} (host hidden)"
    report = await gather(db)
    print_report(report, label, apply)

    duplicates = {f: report["fields"][f]["duplicates"] for f in FIELDS}
    duplicates = {f: found for f, found in duplicates.items() if found}
    steps = plan_steps(report)
    print()
    if not steps:
        print("Nothing to do: the partial unique indexes are in place and the old ones are gone.")
        return 0
    print("Plan:" if apply else "Plan (dry run, nothing will be changed):")
    for number, step in enumerate(steps, 1):
        print(f"  {number}. {step}")

    conflicts = [f for f in FIELDS if report["fields"][f]["new_index_conflict"]]
    if conflicts:
        print(f"\nREFUSING: an index named like the new one exists for {conflicts} but is not the")
        print("expected definition. Nothing was changed. Ask the backend team to look.")
        return 1
    if duplicates:
        print("\nREFUSING: duplicate non-null values exist, the new unique index cannot be built.")
        print("Resolve them first (this script never edits or deletes user data).")
        return 1
    if not apply:
        print("\nDry run only. Re-run with --apply after approval to execute the plan.")
        return 0

    if not await apply_changes(db, report):
        return 1
    after = await gather(db)
    leftover = [
        f
        for f in FIELDS
        if after["fields"][f]["old_index"] or not after["fields"][f]["new_index_present"]
    ]
    if leftover:
        print(f"Finished with leftovers for: {leftover}")
        return 1
    print("\nDone. Indexes now:")
    for name in sorted(after["indexes"]):
        print(f"  - {name}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--apply", action="store_true", help="execute the plan (default: dry run)")
    parser.add_argument("--url", default=None, help="MongoDB URL (default: MONGODB_URL setting)")
    args = parser.parse_args()
    return asyncio.run(run(args.url, args.apply))


if __name__ == "__main__":
    raise SystemExit(main())
