from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.device import Device

class Emergency(Base, TimestampMixin):
    __tablename__ = "emergency"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("device.id"), name="deviceId"
    )
    reasons: Mapped[Optional[dict]] = mapped_column(JSON)
    update_state_interval: Mapped[Optional[int]] = mapped_column(
        Integer, name="updateStateInterval"
    )
    last_state_update: Mapped[Optional[datetime]] = mapped_column(
        DateTime, name="lastStateUpdate"
    )

    device: Mapped[Optional["Device"]] = relationship(back_populates="emergencies")
