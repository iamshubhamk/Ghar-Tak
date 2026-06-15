from app.db.base import Base, import_models
from app.db.session import engine


def create_database_tables() -> None:
    import_models()
    Base.metadata.create_all(bind=engine)
