from pydantic import BaseModel
from datetime import date, datetime

from app.models.metric_value_model import MetricValueModel

class AccountingSheetReportRowModel(BaseModel):
    day: date
    created_at: datetime | None
    metrics: dict[str, MetricValueModel]  # keyed by column_name, e.g. "value1", "value2"
