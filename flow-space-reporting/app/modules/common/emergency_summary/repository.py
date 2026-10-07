from datetime import date, timedelta
from typing import Annotated
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import String, and_, select, func, cast, Integer, true, column, literal, literal_column
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

        # Only snapshots that carry a reasons array (every row today); deviceId/createdAt use idx_emergency_state_device
        conditions = [
            EmergencyState.device_id.in_(select(UserDeviceLink.device_id).where(UserDeviceLink.user_id == user_id)),
            EmergencyState.state.has_key(literal_column("'reasons'")),
        ]
        if device_id is not None:
            conditions.append(EmergencyState.device_id == device_id)
        # Convert the local-day bounds to timestamptz instead of converting the column, so the index on createdAt applies
        if date_from is not None:
            conditions.append(EmergencyState.created_at >= func.timezone(time_zone, cast(date_from, TIMESTAMP)))
        if date_to is not None:
            conditions.append(EmergencyState.created_at < func.timezone(time_zone, cast(date_to + timedelta(days=1), TIMESTAMP)))

        # Keep only the reasons of each snapshot before anything is sorted or grouped: carried along, the whole
        # state (~750 bytes a row) made the sorts spill tens of MB to disk. MATERIALIZED stops the planner
        # from inlining the CTE and pulling the state back in.
        snapshots = (
            select(
                EmergencyState.device_id.label("device_id"),
                EmergencyState.created_at.label("created_at"),
                EmergencyState.state["reasons"].label("reasons"),
            )
            .where(and_(*conditions))
            .cte("snapshots")
            .prefix_with("MATERIALIZED")
        )

        created_at_tz = func.timezone(time_zone, snapshots.c.created_at)
        period_begin = func.date_trunc(period_type.value, created_at_tz)

        reasons_table = func.jsonb_array_elements(snapshots.c.reasons).table_valued(column("reason"), name="reason").lateral("reason")
        reason_description = literal_column("COALESCE(reason->>'title', reason->>'description')", String)
        reason_id = cast(literal_column("reason->>'id'", String), Integer)

        # Group the reasons first and join the device (name, list order) only to the grouped rows
        grouped = (
            select(
                snapshots.c.device_id,
                period_begin.label("period_begin"),
                reason_description.label("emergency_type"),
                reason_id.label("reason_id"),
                func.count().label("occurrences"),
                func.min(created_at_tz).label("first_occurrence"),
                func.max(created_at_tz).label("last_occurrence"),
            )
            .select_from(snapshots)
            .join(reasons_table, true())
            .group_by(snapshots.c.device_id, period_begin, reason_id, reason_description)
            .subquery("grouped")
        )

        period_end = grouped.c.period_begin + cast(literal(f"1 {period_type.value}"), INTERVAL) - cast(literal("1 millisecond"), INTERVAL)

        query = (
            select(
                grouped.c.device_id,
                Device.name.label("device_name"),
                grouped.c.period_begin,
                period_end.label("period_end"),
                grouped.c.emergency_type,
                grouped.c.reason_id,
                grouped.c.occurrences,
                grouped.c.first_occurrence,
                grouped.c.last_occurrence,
            )
            .join(Device, Device.id == grouped.c.device_id)
            .order_by(
                grouped.c.period_begin,
                # devices in the same order as in the dashboard's side menu
                Device.order.asc().nulls_last(),
                grouped.c.device_id,
                grouped.c.reason_id,
                grouped.c.occurrences.desc(),
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
