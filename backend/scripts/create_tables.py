from app.db.init_db import create_database_tables

if __name__ == "__main__":
    create_database_tables()
    print("Database tables created.")
