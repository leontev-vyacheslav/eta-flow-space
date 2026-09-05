from pydantic import BaseModel
from datetime import date, datetime


class MetricValue(BaseModel):
    value: int | None
    consumption: int | None


class AccountingSheetReportRowModel(BaseModel):
    day: date
    created_at: datetime | None
    metrics: dict[str, MetricValue]   # keyed by column_name, e.g. "value1", "value2"
