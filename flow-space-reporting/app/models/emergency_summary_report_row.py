from dataclasses import dataclass
from datetime import datetime


@dataclass
class EmergencySummaryReportRow:
    device_id: int
    device_name: str
    period_begin: datetime
    period_end: datetime
    emergency_type: str
    reason_id: int
    occurrences: int
    first_occurrence: datetime | None
    last_occurrence: datetime | None
