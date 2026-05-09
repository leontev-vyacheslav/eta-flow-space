from enum import StrEnum


class AccountingPeriodTypes(StrEnum):
    MONTH = "month"
    PREVIOUS_MONTH = "previous_month"
    ALL_TIME = "all_time"
