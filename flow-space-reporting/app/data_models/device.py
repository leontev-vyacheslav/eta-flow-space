from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.user_device_link import UserDeviceLink
    from app.data_models.flow import Flow
    from app.data_models.object_location import ObjectLocation
    from app.data_models.device_state import DeviceState
    from app.data_models.emergency_state import EmergencyState
    from app.data_models.emergency import Emergency

class Device(Base, TimestampMixin):
    __tablename__ = "device"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str | None] = mapped_column(String(32))
    name: Mapped[str | None] = mapped_column(String(32))
    description: Mapped[str | None] = mapped_column(String(32))
    flow_id: Mapped[int | None] = mapped_column(ForeignKey("flow.id"), name="flowId")
    settings: Mapped[dict | None] = mapped_column(JSON)
    update_state_interval: Mapped[int | None] = mapped_column(
        Integer, name="updateStateInterval"
    )
    last_state_update: Mapped[datetime | None] = mapped_column(
        DateTime, name="lastStateUpdate"
    )
    object_location_id: Mapped[int | None] = mapped_column(
        ForeignKey("object_location.id"), name="objectLocationId"
    )

    flow: Mapped[Optional["Flow"]] = relationship(back_populates="devices")
    object_location: Mapped[Optional["ObjectLocation"]] = relationship(
        back_populates="devices"
    )
    states: Mapped[list["DeviceState"]] = relationship(back_populates="device")
    emergency_states: Mapped[list["EmergencyState"]] = relationship(
        back_populates="device"
    )
    user_device_links: Mapped[list["UserDeviceLink"]] = relationship(
        back_populates="device"
    )
    emergencies: Mapped[Optional["Emergency"]] = relationship(back_populates="device")
