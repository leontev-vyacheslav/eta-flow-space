from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class EmergencySummaryReportRow:
    device_id: int
    device_name: str
    month: Optional[datetime]
    emergency_type: str
    reason_id: int
    occurrences: int
    first_occurrence: Optional[datetime]
    last_occurrence: Optional[datetime]
