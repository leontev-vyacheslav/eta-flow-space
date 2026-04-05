from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Integer,
    String,
    DateTime,
    Numeric,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


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


class Flow(TimestampMixin, Base):
    __tablename__ = "flow"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[Optional[str]] = mapped_column(String(32))
    name: Mapped[Optional[str]] = mapped_column(String(32))
    description: Mapped[Optional[str]] = mapped_column(String(32))
    uid: Mapped[Optional[str]] = mapped_column(String(16))

    devices: Mapped[list["Device"]] = relationship(back_populates="flow")


class ObjectLocation(TimestampMixin, Base):
    __tablename__ = "object_location"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    address: Mapped[Optional[str]] = mapped_column(String(128))
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(10, 8))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(11, 8))

    devices: Mapped[list["Device"]] = relationship(back_populates="object_location")


class Device(TimestampMixin, Base):
    __tablename__ = "device"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[Optional[str]] = mapped_column(String(32))
    name: Mapped[Optional[str]] = mapped_column(String(32))
    description: Mapped[Optional[str]] = mapped_column(String(32))
    flow_id: Mapped[Optional[int]] = mapped_column(ForeignKey("flow.id"), name="flowId")
    settings: Mapped[Optional[dict]] = mapped_column(JSON)
    update_state_interval: Mapped[Optional[int]] = mapped_column(Integer, name="updateStateInterval")
    last_state_update: Mapped[Optional[datetime]] = mapped_column(DateTime, name="lastStateUpdate")
    object_location_id: Mapped[Optional[int]] = mapped_column(
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


class DeviceState(TimestampMixin, Base):
    __tablename__ = "device_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[Optional[int]] = mapped_column(ForeignKey("device.id"), name="deviceId")
    state: Mapped[Optional[dict]] = mapped_column(JSON)

    device: Mapped[Optional["Device"]] = relationship(back_populates="states")


class Emergency(TimestampMixin, Base):
    __tablename__ = "emergency"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[Optional[int]] = mapped_column(ForeignKey("device.id"), name="deviceId")
    reasons: Mapped[Optional[dict]] = mapped_column(JSON)
    update_state_interval: Mapped[Optional[int]] = mapped_column(Integer, name="updateStateInterval")
    last_state_update: Mapped[Optional[datetime]] = mapped_column(DateTime, name="lastStateUpdate")

    device: Mapped[Optional["Device"]] = relationship(back_populates="emergencies")


class EmergencyState(TimestampMixin, Base):
    __tablename__ = "emergency_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[Optional[int]] = mapped_column(ForeignKey("device.id"), name="deviceId")
    state: Mapped[Optional[dict]] = mapped_column(JSON)

    device: Mapped[Optional["Device"]] = relationship(back_populates="emergency_states")


class User(TimestampMixin, Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[Optional[str]] = mapped_column(String(32))
    password: Mapped[Optional[str]] = mapped_column(String(128))
    role_id: Mapped[Optional[int]] = mapped_column(Integer)
    settings: Mapped[Optional[dict]] = mapped_column(JSON)

    user_device_links: Mapped[list["UserDeviceLink"]] = relationship(
        back_populates="user"
    )


class UserDeviceLink(TimestampMixin, Base):
    __tablename__ = "user_device_link"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("user.id"), name="userId")
    device_id: Mapped[Optional[int]] = mapped_column(ForeignKey("device.id"), name="deviceId")

    user: Mapped[Optional["User"]] = relationship(back_populates="user_device_links")
    device: Mapped[Optional["Device"]] = relationship(
        back_populates="user_device_links"
    )
