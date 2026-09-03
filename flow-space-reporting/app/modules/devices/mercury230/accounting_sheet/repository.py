from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Annotated

from fastapi import HTTPException, status
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, desc, select, func, cast, Integer, literal_column, text

from app.data_models import DeviceState, UserDeviceLink
from app.db.database import get_db
from app.modules.devices.mercury230.accounting_sheet.models import AccountingSheetReportRowModel
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

        return [
            AccountingSheetReportRowModel(
                day=datetime.now(),
                consumption=0,
                volume=0,
                created_at=datetime.now(),
            ) for _ in range(2)
        ]
