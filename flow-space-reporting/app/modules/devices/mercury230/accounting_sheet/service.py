from pathlib import Path
from typing import Annotated
from fastapi.params import Depends

from app.services.accounting_sheet_base_service import AccountingSheetReportBaseService
from app.modules.devices.mercury230.accounting_sheet.repository import AccountingSheetRepository


class AccountingSheetReportService(AccountingSheetReportBaseService):
    report_name = "accounting_sheet_report"

    def __init__(self, repository: Annotated[AccountingSheetRepository, Depends(AccountingSheetRepository)]):
        self.templates_dir = Path(__file__).parent.parent.parent.parent.parent / "templates/devices/mercury230"

        super().__init__(repository, templates_dir=self.templates_dir)
