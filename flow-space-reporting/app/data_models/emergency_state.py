from typing import TYPE_CHECKING, Optional

from sqlalchemy import Integer, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.device import Device


class EmergencyState(Base, TimestampMixin):
    __tablename__ = "emergency_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("device.id"), name="deviceId")
    state: Mapped[dict | None] = mapped_column(JSON)

    device: Mapped[Optional["Device"]] = relationship(back_populates="emergency_states")
