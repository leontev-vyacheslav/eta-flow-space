from typing import Optional

from sqlalchemy import Integer, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin


class DeviceState(Base, TimestampMixin):
    __tablename__ = "device_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("device.id"), name="deviceId"
    )
    state: Mapped[Optional[dict]] = mapped_column(JSON)

    device: Mapped[Optional["Device"]] = relationship(back_populates="states")  # type: ignore
