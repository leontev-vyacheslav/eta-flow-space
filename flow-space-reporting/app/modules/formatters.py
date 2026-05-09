from datetime import date, datetime
from typing import Any
from babel.dates import format_datetime, format_date

from app.config import settings
from app.models.period_types import PeriodTypes


def locale_format_date(value: Any) -> str:
    if value is None:
        return "Нет данных"
    if isinstance(value, date):
        return format_date(value, format='short', locale=settings.DEFAULT_REPORT_LOCALE)
    return str(value)


def locale_format_datetime(value: Any, format: str = "short") -> str:
    if value is None:
        return "Нет данных"
    if isinstance(value, datetime):
        return format_datetime(value, format, locale=settings.DEFAULT_REPORT_LOCALE)
    return str(value)


def locale_format_month(value: Any) -> str:
    if not value:
        return "Нет данных"
    return format_datetime(value, format="short", locale=settings.DEFAULT_REPORT_LOCALE)


def period_type_title_format(value: Any) -> str:
    if value == PeriodTypes.MONTH:
        return "месяц"
    if value == PeriodTypes.WEEK:
        return "неделя"
    if value == PeriodTypes.DAY:
        return "сутки"

    return "Нет данных"

