from typing import Annotated

from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import String, and_, or_, select, text, func, cast, Integer, true, column, literal_column

from app.data_models import Device, EmergencyState, UserDeviceLink
from app.db.database import get_db
from app.models.emergency_summary_report_row import EmergencySummaryReportRow
from app.models.emergency_period_types import EmergencyPeriodType


class EmergencyRepository:

    def __init__(self, session: Annotated[AsyncSession, Depends(get_db)]):
        self._session = session

    async def get_emergency_summary_by_month(
        self, user_id: int, period_type: EmergencyPeriodType, device_id: int | None, time_zone: str
    ) -> list[EmergencySummaryReportRow]:
        created_at_tz = func.timezone(time_zone, EmergencyState.created_at)
        period_begin = func.date_trunc(period_type.value, created_at_tz)
        period_end_sql = {
            "day": f"date_trunc('{period_type.value}', timezone('{time_zone}', emergency_state.\"createdAt\")) + INTERVAL '1 day' - INTERVAL '1 millisecond'",
            "week": f"date_trunc('{period_type.value}', timezone('{time_zone}', emergency_state.\"createdAt\")) + INTERVAL '1 week' - INTERVAL '1 millisecond'",
            "month": f"date_trunc('{period_type.value}', timezone('{time_zone}', emergency_state.\"createdAt\")) + INTERVAL '1 month' - INTERVAL '1 millisecond'",
        }[period_type.value]

        period_end = literal_column(f"({period_end_sql})")

        reasons_table = func.json_array_elements(EmergencyState.state["reasons"]).table_valued(column("reason"), name="reason").lateral("reason")
        reason_description = literal_column("reason->>'description'", String)
        reason_id = cast(literal_column("reason->>'id'", String), Integer)

        conditions = [UserDeviceLink.user_id == user_id]
        if device_id is not None:
            conditions.append(EmergencyState.device_id == device_id)

        query = (
            select(
                EmergencyState.device_id,
                Device.name.label("device_name"),
                period_begin.label("period_begin"),
                period_end.label("period_end"),
                reason_description.label("emergency_type"),
                reason_id.label("reason_id"),
                func.count().label("occurrences"),
                func.min(created_at_tz).label("first_occurrence"),
                func.max(created_at_tz).label("last_occurrence"),
            )
            .select_from(EmergencyState)
            .join(Device, EmergencyState.device_id == Device.id)
            .join(UserDeviceLink, Device.id == UserDeviceLink.device_id)
            .join(reasons_table, true())
            .where(and_(*conditions))
            .group_by(
                EmergencyState.device_id,
                Device.name,
                period_begin,
                period_end,
                reason_id,
                reason_description,
            )
            .order_by(
                period_begin,
                EmergencyState.device_id,
                reason_id,
                text("occurrences DESC"),
            )
        )

        result = await self._session.execute(query)
        rows = result.fetchall()

        return [
            EmergencySummaryReportRow(
                device_id=row.device_id,
                device_name=row.device_name,
                period_begin=row.period_begin,
                period_end=row.period_end,
                emergency_type=row.emergency_type,
                reason_id=row.reason_id,
                occurrences=row.occurrences,
                first_occurrence=row.first_occurrence,
                last_occurrence=row.last_occurrence,
            )
            for row in rows
        ]
