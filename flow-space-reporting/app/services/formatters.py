from datetime import datetime
from typing import Any
from babel.dates import format_datetime

from app.config import settings
from app.models.period_types import PeriodTypes


def locale_format_datetime(value: Any, format: str = "short") -> str:
    if value is None:
        return "N/A"
    if isinstance(value, datetime):
        return format_datetime(value, format, locale=settings.DEFAULT_REPORT_LOCALE)
    return str(value)


def locale_format_month(value: Any) -> str:
    if not value:
        return "N/A"
    return format_datetime(value, format="short", locale=settings.DEFAULT_REPORT_LOCALE)


def period_type_title_format(value: Any) -> str:
    if value == PeriodTypes.month:
        return "месяц"
    if value == PeriodTypes.week:
        return "неделя"
    if value == PeriodTypes.day:
        return "сутки"

    return value


def period_type_group_format(value: Any) -> str:
    if value == PeriodTypes.month:
        return "месяц"
    if value == PeriodTypes.week:
        return "неделя"
    if value == PeriodTypes.day:
        return "сутки"

    return value
