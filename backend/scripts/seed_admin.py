import os

from sqlalchemy import select

from app.db.init_db import create_database_tables
from app.db.session import SessionLocal
from app.models.user import User
from app.services.auth import AuthService


def main() -> None:
    create_database_tables()

    admin_name = os.getenv("ADMIN_NAME", "GharTak Admin")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@ghartak.local")
    admin_phone = os.getenv("ADMIN_PHONE")
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe@123")

    with SessionLocal() as db:
        existing_admin = db.execute(
            select(User).where(User.email == admin_email.lower())
        ).scalar_one_or_none()

        if existing_admin:
            print(f"Admin already exists: {admin_email}")
            return

        AuthService(db).create_admin_user(
            name=admin_name,
            email=admin_email,
            phone=admin_phone,
            password=admin_password,
        )
        print(f"Admin created: {admin_email}")
