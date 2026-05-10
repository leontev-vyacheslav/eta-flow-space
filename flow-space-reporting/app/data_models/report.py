from typing import TYPE_CHECKING, Optional

from sqlalchemy import Integer, JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.device import Device

class Report(Base, TimestampMixin):
    __tablename__ = "report"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    code: Mapped[str | None] = mapped_column(String(64))

    description: Mapped[str | None] = mapped_column(String(128))

    device_id: Mapped[int | None] = mapped_column(
        ForeignKey("device.id"), name="deviceId"
    )

    url: Mapped[str | None] = mapped_column(String)
    settings: Mapped[dict | None] = mapped_column(JSON)

    device: Mapped[Optional["Device"]] = relationship(back_populates="reports")