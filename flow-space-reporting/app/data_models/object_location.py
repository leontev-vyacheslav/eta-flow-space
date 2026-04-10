from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.device import Device

class ObjectLocation(Base, TimestampMixin):
    __tablename__ = "object_location"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    address: Mapped[str | None] = mapped_column(String(128))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8))
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8))

    devices: Mapped[list["Device"]] = relationship(back_populates="object_location")
