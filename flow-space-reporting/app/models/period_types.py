from enum import StrEnum


class PeriodTypes(StrEnum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    PREVIOUS_MONTH = "previous_month"
    ALL_TIME = "all_time"
