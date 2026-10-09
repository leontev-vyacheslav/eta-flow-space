from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.device import Device

class DeviceType(Base, TimestampMixin):
    __tablename__ = "device_type"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(32))
    description: Mapped[str | None] = mapped_column(String(64))
    settings: Mapped[dict | None] = mapped_column(JSON)

    devices: Mapped[list["Device"]] = relationship(back_populates="device_type")
