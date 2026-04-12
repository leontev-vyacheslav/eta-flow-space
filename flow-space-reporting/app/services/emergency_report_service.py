from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from babel.dates import format_date, format_datetime
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.config import settings
from app.models.emergency_summary_report_row import EmergencySummaryReportRow
from app.models.emergency_period_types import EmergencyPeriodType


templates_dir = Path(__file__).parent.parent / "templates/reports"
template_env = Environment(loader=FileSystemLoader(templates_dir))


def _locale_format_datetime(value: Any, format: str = "short") -> str:
    if value is None:
        return "N/A"
    if isinstance(value, datetime):
        return format_datetime(value, format, locale=settings.DEFAULT_REPORT_LOCALE)
    return str(value)


def _locale_format_month(value: Any) -> str:
    if not value:
        return "N/A"
    return format_datetime(value, format="short", locale=settings.DEFAULT_REPORT_LOCALE)


def _period_type_title_format(value: Any) -> str:
    if value == EmergencyPeriodType.month:
        return "ежемесячный"
    if value == EmergencyPeriodType.week:
        return "еженедельный"
    if value == EmergencyPeriodType.day:
        return "ежедневный"

    return value


def _period_type_group_format(value: Any) -> str:
    if value == EmergencyPeriodType.month:
        return "месяц"
    if value == EmergencyPeriodType.week:
        return "неделя"
    if value == EmergencyPeriodType.day:
        return "день"

    return value


template_env.filters["locale_format_datetime"] = _locale_format_datetime
template_env.filters["locale_format_month"] = _locale_format_month
template_env.filters["period_type_title_format"] = _period_type_title_format
template_env.filters["period_type_group_format"] = _period_type_group_format


class EmergencySummaryReportService:

    def __group_data(
        self,
        rows: list[EmergencySummaryReportRow],
    ) -> list[tuple[tuple[int, str, datetime | None, datetime | None], list[EmergencySummaryReportRow]]]:
        grouped: dict[tuple[int, str, datetime | None, datetime | None], list[EmergencySummaryReportRow]] = {}
        for row in rows:
            key = (row.device_id, row.device_name, row.period_begin, row.period_end)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(row)

        return sorted(grouped.items(), key=lambda x: (x[0][2] or datetime.min, x[0][0] or 0))

    def render(self, rows: list[EmergencySummaryReportRow], period_type: EmergencyPeriodType, is_admin: bool) -> tuple[bytes | None, str]:

        grouped_data = self.__group_data(rows)

        html_content = template_env.get_template("emergency_summary_report.html").render(
            data=dict(grouped_data),
            templates_dir=templates_dir.as_uri(),
            is_admin=is_admin,
            period_type=period_type.value,
        )

        pdf_bytes = HTML(string=html_content).write_pdf()

        filename = f"emergency_summary_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename
