from typing_extensions import Annotated
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db

from app.repositories.accounting_sheet_base_repository import AccountingSheetBaseRepository


class AccountingSheetRepository(AccountingSheetBaseRepository):
    def __init__(self, session: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(session)

        self.METRICS = [
            ("totalHeatConsumption", "totalHeat"),
            ("massInputPipe", "massInputPipe"),
            ("massReturnPipe", "massReturnPipe"),
            ("volumeInputPipe", "volumeInputPipe"),
            ("volumeReturnPipe", "volumeReturnPipe"),
        ]
