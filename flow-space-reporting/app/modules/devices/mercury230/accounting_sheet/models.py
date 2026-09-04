from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class AccountingSheetReportRowModel:
    day: date
    created_at: datetime | None

    value: int | None
    consumption: int | None
