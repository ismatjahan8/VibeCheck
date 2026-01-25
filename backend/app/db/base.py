from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models so Alembic can autogenerate migrations.
# noqa: F401
from app import models  # type: ignore

