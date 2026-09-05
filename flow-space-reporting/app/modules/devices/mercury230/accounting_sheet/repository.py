from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Annotated

from fastapi import HTTPException, status
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, desc, or_, select, func, cast, Integer, literal_column, text

from app.data_models import DeviceState, UserDeviceLink
from app.db.database import get_db
from app.modules.devices.mercury230.accounting_sheet.models import AccountingSheetReportRowModel, MetricValue
from app.models.accounting_period_types import AccountingPeriodTypes


class AccountingSheetRepository:
    def __init__(self, session: Annotated[AsyncSession, Depends(get_db)]):
        self._session = session

    async def get_data_async(
        self, token_payload: dict, time_zone: str, device_id: int | None, period_type: AccountingPeriodTypes
    ) -> list[AccountingSheetReportRowModel]:
        user_id = token_payload.get("userId")

        check_user_query = (
            select(UserDeviceLink.user_id).where(and_(UserDeviceLink.user_id == user_id, UserDeviceLink.device_id == device_id)).select_from(UserDeviceLink)
        )
        check_user_query_result = await self._session.execute(check_user_query)

        has_access = check_user_query_result.first() is not None
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "Отсутствуют права доступа к устройству",
                    "severity": "warning",
                },
            )

        today = date.today()
        date_to = datetime.now()
        if period_type == AccountingPeriodTypes.MONTH:
            date_from = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            date_to = today + relativedelta(days=1)
        elif period_type == AccountingPeriodTypes.PREVIOUS_MONTH:
            date_from = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=1)
            date_to = date_from + relativedelta(months=1)
        elif period_type == AccountingPeriodTypes.ALL_TIME:
            date_from = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0) - relativedelta(months=3)
            date_to = date_from + relativedelta(months=4)

        # NEW: pull in one extra day before the reporting window so the first
        # row has a prior value to diff against
        query_date_from = date_from - relativedelta(days=1)

        # Define once — add/remove metrics here and nothing else needs to change
        METRICS = [
            ("energyActiveTotal", "energyActiveTotal"),
            ("energyActiveTariff1", "energyActiveTariff1"),
            ("energyActiveTariff2", "energyActiveTariff2"),
        ]

        accumulated_consumption = [cast(literal_column(f"state -> '{json_key}'"), Integer).label(column_name) for json_key, column_name in METRICS]

        created_at_tz = func.timezone(time_zone, DeviceState.created_at).label("created_at")
        day_expr = func.date(created_at_tz)

        daily_last = (
            select(day_expr.label("day"), created_at_tz.label("created_at"), *accumulated_consumption)
            .where(
                DeviceState.device_id == device_id,
                created_at_tz >= query_date_from,
                created_at_tz < date_to,
                # keep a not-null guard on at least one metric so bootstrap/day rows
                # with no readings at all are still excluded; adjust per your needs
                or_(*[DeviceState.state[json_key] != None for json_key, _ in METRICS]),
            )
            .distinct(day_expr)
            .order_by(day_expr, desc(created_at_tz))
            .cte("daily_last")
        )

        date_series = select(
            func.generate_series(
                func.date(query_date_from),
                func.date(date_to) - text("INTERVAL '1 day'"),
                text("INTERVAL '1 day'"),
            ).label("day")
        ).cte("date_series")

        all_days_with_data = (
            select(
                date_series.c.day,
                *[c for c in daily_last.c if c.name != "day"],
            )
            .outerjoin(daily_last, date_series.c.day == daily_last.c.day)
            .order_by(date_series.c.day)
        ).cte("all_days_with_data")

        # Build a LAG + consumption column per metric
        consumption_cols = []
        for _, column_name in METRICS:
            metric_col = getattr(all_days_with_data.c, column_name)
            lag_col = func.lag(metric_col).over(order_by=all_days_with_data.c.day)
            consumption_cols.append((metric_col - lag_col).label(f"consumption_{column_name}"))

        with_consumption = (
            select(
                all_days_with_data.c.day,
                all_days_with_data.c.created_at,
                *[getattr(all_days_with_data.c, column_name) for _, column_name in METRICS],
                *consumption_cols,
            )
        ).cte("with_consumption")

        query = select(with_consumption).where(with_consumption.c.day >= func.date(date_from)).order_by(with_consumption.c.day)

        result = await self._session.execute(query)
        rows = result.fetchall()

        data = [
            AccountingSheetReportRowModel(
                day=row.day,
                created_at=row.created_at,
                metrics={
                    column_name: MetricValue(
                        value=getattr(row, column_name),
                        consumption=getattr(row, f"consumption_{column_name}"),
                    )
                    for _, column_name in METRICS
                },
            )
            for row in rows
        ]

        return data
