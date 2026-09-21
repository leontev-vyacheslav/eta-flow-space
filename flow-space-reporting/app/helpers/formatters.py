from datetime import date, datetime
from typing import Any
from babel.dates import format_datetime, format_date
from babel.numbers import format_decimal

from app.config import settings
from app.models.period_types import PeriodTypes


def format_number(value, precision=2):
    if value is None:
        return "-"
    # Babel uses a pattern string to control decimal places.
    # The pattern '#,##0.00' means grouped thousands with exactly 2 decimals.
    pattern = "#,##0." + ("0" * precision)
    return format_decimal(value, format=pattern, locale="ru_RU")


def locale_format_date(value: Any) -> str:
    if value is None:
        return "Нет данных"
    if isinstance(value, date):
        return format_date(value, format="short", locale=settings.DEFAULT_REPORT_LOCALE)
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


def locale_format_month_name(value: Any) -> str:
    if not value:
        return "Нет данных"
    return format_datetime(value, "LLLL yyyy", locale=settings.DEFAULT_REPORT_LOCALE)


def period_type_title_format(value: Any) -> str:
    if value == PeriodTypes.MONTH:
        return "месяц"
    if value == PeriodTypes.WEEK:
        return "неделя"
    if value == PeriodTypes.DAY:
        return "сутки"
    if value == PeriodTypes.PREVIOUS_MONTH:
        return "предыдущий месяц"
    if value == PeriodTypes.ALL_TIME:
        return "весь период"

    return "Нет данных"
