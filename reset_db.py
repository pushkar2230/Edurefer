import sqlite3
import os

db_path = "backend/backend_data.db"

if os.path.exists(db_path):
    os.remove(db_path)
    print(f"Database {db_path} deleted successfully")
else:
    print(f"Database {db_path} not found")

print("Database reset complete")
