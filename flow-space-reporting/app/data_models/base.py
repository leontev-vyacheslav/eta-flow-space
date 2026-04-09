from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """Mixin that adds createdAt/updatedAt columns to models."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime, name="createdAt", server_default="CURRENT_TIMESTAMP"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, name="updatedAt", server_default="CURRENT_TIMESTAMP"
    )
