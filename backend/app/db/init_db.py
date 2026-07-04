from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.base import Base, import_models
from app.db.session import engine


def create_database_tables() -> None:
    import_models()
    Base.metadata.create_all(bind=engine)
    ensure_booking_schema()


def ensure_booking_schema() -> None:
    if engine.dialect.name != "postgresql":
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE bookings ALTER COLUMN provider_id DROP NOT NULL"))
        connection.execute(
            text(
                "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
                "payment_status VARCHAR(40) NOT NULL DEFAULT 'CASH_PENDING'"
            )
        )


def ensure_booking_schema_for_session(db: Session) -> None:
    bind = db.get_bind()
    if bind.dialect.name != "postgresql":
        return

    db.execute(text("ALTER TABLE bookings ALTER COLUMN provider_id DROP NOT NULL"))
    db.execute(
        text(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "
            "payment_status VARCHAR(40) NOT NULL DEFAULT 'CASH_PENDING'"
        )
    )


def ensure_review_schema_for_session(db: Session) -> None:
    from app.models.booking import Review

    bind = db.get_bind()
    Review.__table__.create(bind=bind, checkfirst=True)


def ensure_notification_schema_for_session(db: Session) -> None:
    from app.models.booking import Notification

    bind = db.get_bind()
    Notification.__table__.create(bind=bind, checkfirst=True)
