import os
import sys

from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core.enums import UserRole
from app.core.security import hash_password, verify_password
from app.db.init_db import create_database_tables
from app.db.session import SessionLocal
from app.models.user import User
from app.services.auth import AuthService


def _safe_database_url() -> str:
    return make_url(get_settings().database_url).render_as_string(hide_password=True)


def main() -> None:
    print("Starting admin seed...", flush=True)
    print(f"Database: {_safe_database_url()}", flush=True)
    create_database_tables()

    admin_name = os.getenv("ADMIN_NAME", "GharTak Admin").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@ghartak.local").strip().lower()
    admin_phone = os.getenv("ADMIN_PHONE") or None
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe@123")

    with SessionLocal() as db:
        existing_admin = db.execute(
            select(User).where(User.email == admin_email.lower())
        ).scalar_one_or_none()

        if existing_admin:
            existing_admin.name = admin_name
            existing_admin.phone = admin_phone
            existing_admin.password_hash = hash_password(admin_password)
            existing_admin.role = UserRole.ADMIN.value
            existing_admin.is_active = True
            db.commit()
            db.refresh(existing_admin)
            if not verify_password(admin_password, existing_admin.password_hash):
                raise RuntimeError("Admin password verification failed after update.")
            print(f"Admin updated: {admin_email}", flush=True)
            print("Admin seed completed successfully.", flush=True)
            return

        admin = AuthService(db).create_admin_user(
            name=admin_name,
            email=admin_email,
            phone=admin_phone,
            password=admin_password,
        )
        if not verify_password(admin_password, admin.password_hash):
            raise RuntimeError("Admin password verification failed after create.")
        print(f"Admin created: {admin_email}", flush=True)
        print("Admin seed completed successfully.", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Admin seed failed: {exc}", file=sys.stderr, flush=True)
        raise
