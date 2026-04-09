from typing import TYPE_CHECKING, Optional

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.device import Device

class Flow(Base, TimestampMixin):
    __tablename__ = "flow"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[Optional[str]] = mapped_column(String(32))
    name: Mapped[Optional[str]] = mapped_column(String(32))
    description: Mapped[Optional[str]] = mapped_column(String(32))
    uid: Mapped[Optional[str]] = mapped_column(String(16))

    devices: Mapped[list["Device"]] = relationship(back_populates="flow")
