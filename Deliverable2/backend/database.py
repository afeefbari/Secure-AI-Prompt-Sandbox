"""
Database module — SQLite via raw sqlite3.
Keeps zero external dependencies beyond Python stdlib.
Tables: users
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sandbox.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist. Called once on startup."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT    UNIQUE NOT NULL,
            password TEXT    NOT NULL,
            role     TEXT    NOT NULL DEFAULT 'user'
        )
    """)
    conn.commit()
    conn.close()


# ── User helpers ──────────────────────────────────────────────────────────────

def get_user(username: str) -> sqlite3.Row | None:
    conn = get_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    return user


def create_user(username: str, hashed_password: str, role: str = "user") -> None:
    conn = get_connection()
    conn.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        (username, hashed_password, role),
    )
    conn.commit()
    conn.close()
