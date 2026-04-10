from typing import TYPE_CHECKING, Optional

from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.user import User
    from app.data_models.device import Device

class UserDeviceLink(Base, TimestampMixin):
    __tablename__ = "user_device_link"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("user.id"), name="userId")
    device_id: Mapped[int | None] = mapped_column(
        ForeignKey("device.id"), name="deviceId"
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="user_device_links")
    device: Mapped[Optional["Device"]] = relationship(
        back_populates="user_device_links"
    )
