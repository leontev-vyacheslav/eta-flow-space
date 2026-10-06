from datetime import date, timedelta
from typing import Annotated
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import String, and_, select, text, func, cast, Integer, true, column, literal, literal_column
from sqlalchemy.dialects.postgresql import INTERVAL, TIMESTAMP

from app.data_models import Device, EmergencyState, UserDeviceLink
from app.db.database import get_db
from app.modules.common.emergency_summary.models import EmergencySummaryReportRowModel
from app.models.grouping_period_types import GroupingPeriodTypes


class EmergencySummaryRepository:

    def __init__(self, session: Annotated[AsyncSession, Depends(get_db)]):
        self._session = session

    async def get_data_async(
        self,
        token_payload: dict,
        time_zone: str,
        device_id: int | None,
        period_type: GroupingPeriodTypes,
        date_from: date | None = None,
        date_to: date | None = None,
        **kwargs,
    ) -> list[EmergencySummaryReportRowModel]:
        user_id = token_payload.get("userId")
        created_at_tz = func.timezone(time_zone, EmergencyState.created_at)
        period_begin = func.date_trunc(period_type.value, created_at_tz)
        period_end = period_begin + cast(literal(f"1 {period_type.value}"), INTERVAL) - cast(literal("1 millisecond"), INTERVAL)

        reasons_table = func.jsonb_array_elements(EmergencyState.state["reasons"]).table_valued(column("reason"), name="reason").lateral("reason")
        reason_description = literal_column("COALESCE(reason->>'title', reason->>'description')", String)
        reason_id = cast(literal_column("reason->>'id'", String), Integer)

        # Constant predicate so the planner can use the partial index idx_emergency_state_device_created
        conditions = [
            UserDeviceLink.user_id == user_id,
            EmergencyState.state.has_key(literal_column("'reasons'")),
        ]
        if device_id is not None:
            conditions.append(EmergencyState.device_id == device_id)
        # Convert the local-day bounds to timestamptz instead of converting the column, so the index on createdAt applies
        if date_from is not None:
            conditions.append(EmergencyState.created_at >= func.timezone(time_zone, cast(date_from, TIMESTAMP)))
        if date_to is not None:
            conditions.append(EmergencyState.created_at < func.timezone(time_zone, cast(date_to + timedelta(days=1), TIMESTAMP)))

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
                Device.order,
                period_begin,
                reason_id,
                reason_description,
            )
            .order_by(
                period_begin,
                # devices in the same order as in the dashboard's side menu
                Device.order.asc().nulls_last(),
                EmergencyState.device_id,
                reason_id,
                text("occurrences DESC"),
            )
        )

        result = await self._session.execute(query)
        rows = result.fetchall()

        return [
            EmergencySummaryReportRowModel(
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
