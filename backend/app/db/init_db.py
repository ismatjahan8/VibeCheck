from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


def ensure_db() -> None:
    # Basic connectivity check
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

