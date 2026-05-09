from datetime import datetime
from dateutil.relativedelta import relativedelta
from typing import Annotated

from fastapi import HTTPException, status
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import JSON, and_, desc, select, func, cast, Integer, literal_column

from app.data_models import DeviceState, UserDeviceLink
from app.db.database import get_db
from app.modules.devices.spring2.accounting_sheet_gas_meter.models import AccountingSheetGasMeterReportRowModel
from app.models.accounting_period_types import AccountingPeriodTypes


class AccountingSheetGasMeterRepository:
    def __init__(self, session: Annotated[AsyncSession, Depends(get_db)]):
        self._session = session

    async def get_data_async(
        self, token_payload: dict, time_zone: str, device_id: int | None, period_type: AccountingPeriodTypes
    ) -> list[AccountingSheetGasMeterReportRowModel]:
        user_id = token_payload.get("userId")

        check_user_query = (
            select(UserDeviceLink.user_id).where(and_(UserDeviceLink.user_id == user_id, UserDeviceLink.device_id == device_id)).select_from(UserDeviceLink)
        )
        check_user_query_result = await self._session.execute(check_user_query)

        has_access = check_user_query_result.first() is not None
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Отсутствуют права доступа к устройству",
            )
        
        date_from = datetime(1970, 1, 1)
        date_to = datetime.now()
        if period_type == AccountingPeriodTypes.MONTH:
            date_from = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            date_to = date_to = date_from + relativedelta(months=1)
        elif period_type == AccountingPeriodTypes.PREVIOUS_MONTH:
            date_from = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=1)
            date_to = date_from + relativedelta(months=1)

        state_json = cast(DeviceState.state, JSON)

        accumulated_volume = cast(
            literal_column("state::json -> 'gasMeter' ->> 'accumulatedVolume'"),
            Integer,
        )
        created_at_tz = func.timezone(time_zone, DeviceState.created_at).label("created_at")
        day_expr = func.date(created_at_tz)

        daily_last = (
            select(
                day_expr.label("day"),
                created_at_tz.label("created_at"),
                accumulated_volume.label("volume"),
            )
            .where(
                DeviceState.device_id == device_id,
                DeviceState.created_at >= date_from,
                DeviceState.created_at < date_to,
                state_json["gasMeter"]["accumulatedVolume"] != None,
            )
            .distinct(day_expr)
            .order_by(day_expr, desc(created_at_tz))
            .cte("daily_last")
        )

        lag_volume = func.lag(daily_last.c.volume).over(order_by=daily_last.c.day)

        query = select(
            daily_last.c.day,
            daily_last.c.created_at,
            daily_last.c.volume,
            (daily_last.c.volume - lag_volume).label("consumption"),
        ).order_by(daily_last.c.day)

        result = await self._session.execute(query)
        rows = result.fetchall()

        return [
            AccountingSheetGasMeterReportRowModel(
                day=row.day,
                created_at=row.created_at,
                volume=row.volume,
                consumption=row.consumption,
            )
            for row in rows
        ]
