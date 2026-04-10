from typing import Annotated

from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func, cast, Integer, true, column, literal_column

from app.data_models import Device, EmergencyState, UserDeviceLink
from app.db.database import get_db
from app.models.emergency_summary_report_row import EmergencySummaryReportRow


class EmergencyRepository:

    def __init__(self, session: Annotated[AsyncSession, Depends(get_db)]):
        self._session = session

    async def get_emergency_summary_by_month(self, user_id: int, time_zone: str) -> list[EmergencySummaryReportRow]:
        reasons_table = (
            func.json_array_elements(EmergencyState.state["reasons"])
            .table_valued(column("reason"), name="reason")
            .lateral("reason")
        )

        created_at_tz = func.timezone(time_zone, EmergencyState.created_at)

        query = (
            select(
                EmergencyState.device_id,
                Device.name.label("device_name"),
                func.date_trunc("month", created_at_tz).label("month"),
                literal_column("reason->>'description'").label("emergency_type"),
                cast(literal_column("(reason->>'id')"), Integer).label("reason_id"),
                func.count().label("occurrences"),
                func.min(created_at_tz).label("first_occurrence"),
                func.max(created_at_tz).label("last_occurrence"),
            )
            .select_from(EmergencyState)
            .join(Device, EmergencyState.device_id == Device.id)
            .join(UserDeviceLink, Device.id == UserDeviceLink.device_id)
            .join(reasons_table, true())
            .where(UserDeviceLink.user_id == user_id)
            .group_by(
                EmergencyState.device_id,
                Device.name,
                "month",
                "reason_id",
                "emergency_type",
            )
            .order_by(
                text("month"),
                EmergencyState.device_id,
                text("reason_id"),
                text("occurrences DESC"),
            )
        )

        result = await self._session.execute(query)
        rows = result.fetchall()

        return [
            EmergencySummaryReportRow(
                device_id=row.device_id,
                device_name=row.device_name,
                month=row.month,
                emergency_type=row.emergency_type,
                reason_id=row.reason_id,
                occurrences=row.occurrences,
                first_occurrence=row.first_occurrence,
                last_occurrence=row.last_occurrence,
            )
            for row in rows
        ]
