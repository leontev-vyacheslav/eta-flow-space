from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.data_models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.data_models.user_device_link import UserDeviceLink

class User(Base, TimestampMixin):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str | None] = mapped_column(String(32))
    password: Mapped[str | None] = mapped_column(String(128))
    role_id: Mapped[int | None] = mapped_column(Integer)
    settings: Mapped[dict | None] = mapped_column(JSON)

    user_device_links: Mapped[list["UserDeviceLink"]] = relationship(
        back_populates="user"
    )
