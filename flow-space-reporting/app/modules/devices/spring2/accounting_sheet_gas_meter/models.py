from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class AccountingSheetGasMeterReportRowModel:
    day: date
    created_at: datetime
    volume: int
    consumption: int
