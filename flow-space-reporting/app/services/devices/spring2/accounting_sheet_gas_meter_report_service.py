from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.services.formatters import locale_format_datetime, locale_format_month, period_type_group_format, period_type_title_format

templates_dir = Path(__file__).parent.parent.parent.parent / "templates/devices/spring2"
template_env = Environment(loader=FileSystemLoader(templates_dir))


template_env.filters["locale_format_datetime"] = locale_format_datetime
template_env.filters["locale_format_month"] = locale_format_month
template_env.filters["period_type_title_format"] = period_type_title_format
template_env.filters["period_type_group_format"] = period_type_group_format

class AccountingSheetGasMeterReportService:
    report_name = "accounting_sheet_gas_meter_report"

    def render(self, *args: Any, **kwargs: Any) -> tuple[bytes | None, str]:

        html_content = template_env.get_template(f"{self.report_name}.html").render(*args, **kwargs, templates_dir=templates_dir)
        pdf_bytes = HTML(string=html_content).write_pdf()

        filename = f"{self.report_name}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename
