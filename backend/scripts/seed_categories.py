from app.db.init_db import create_database_tables
from app.db.session import SessionLocal
from app.services.categories import CategoryService


def main() -> None:
    create_database_tables()

    with SessionLocal() as db:
        created_categories = CategoryService(db).ensure_default_categories()

    print(f"Seeded {len(created_categories)} default categories.")


if __name__ == "__main__":
    main()
