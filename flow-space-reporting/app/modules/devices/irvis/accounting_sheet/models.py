from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class AccountingSheetGasMeterReportRowModel:
    day: date
    created_at: datetime | None
    volume: int | None
    consumption: int | None
