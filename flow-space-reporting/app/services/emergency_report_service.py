from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from babel.dates import format_date, format_datetime
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.config import settings
from app.repositories.emergency_repository import EmergencySummaryReportRow


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
    return format_date(value, format="LLLL yyyy", locale=settings.DEFAULT_REPORT_LOCALE)


template_env.filters["locale_format_datetime"] = _locale_format_datetime
template_env.filters["locale_format_month"] = _locale_format_month


class EmergencySummaryReportService:

    def __group_data(
        self,
        rows: list[EmergencySummaryReportRow],
    ) -> list[tuple[tuple[int, str, datetime | None], list[EmergencySummaryReportRow]]]:
        grouped: dict[tuple[int, str, datetime | None], list[EmergencySummaryReportRow]] = {}
        for row in rows:
            key = (row.device_id, row.device_name, row.period)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(row)

        return sorted(grouped.items(), key=lambda x: (x[0][2] or datetime.min, x[0][0] or 0))

    def render(self, rows: list[EmergencySummaryReportRow], is_admin: bool) -> tuple[bytes | None, str]:

        grouped_data = self.__group_data(rows)

        html_content = template_env.get_template("emergency_summary_report.html").render(
            data=dict(grouped_data),
            templates_dir=templates_dir.as_uri(),
            is_admin=is_admin,
        )

        pdf_bytes = HTML(string=html_content).write_pdf()

        filename = f"emergency_summary_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename
