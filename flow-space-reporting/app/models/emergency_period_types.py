from enum import Enum

class EmergencyPeriodType(str, Enum):
    day   = "day"
    week  = "week"
    month = "month"