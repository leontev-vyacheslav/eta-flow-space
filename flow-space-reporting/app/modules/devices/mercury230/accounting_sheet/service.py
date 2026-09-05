from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any
from fastapi import HTTPException, status
from fastapi.params import Depends
from jinja2 import Environment, FileSystemLoader
import pytz
from weasyprint import HTML
from collections import defaultdict

from app.modules.devices.mercury230.accounting_sheet.repository import AccountingSheetRepository
from app.modules.formatters import *

templates_dir = Path(__file__).parent.parent.parent.parent.parent / "templates/devices/mercury230"
template_env = Environment(loader=FileSystemLoader(templates_dir))

filters = [
    locale_format_date,
    locale_format_datetime,
    locale_format_month,
    locale_format_month_name,
    period_type_title_format,
]

for filter in filters:
    template_env.filters[filter.__name__] = filter


class AccountingSheetReportService:
    report_name = "accounting_sheet_report"

    def __init__(self, repository: Annotated[AccountingSheetRepository, Depends(AccountingSheetRepository)]):
        self._repository = repository

    async def render_async(self, *args: Any, **kwargs: Any) -> tuple[bytes | None, str]:
        time_zone: str = kwargs["time_zone"]

        if time_zone not in pytz.all_timezones:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Указана неверная временная зона в запросе: {time_zone}",
            )

        try:
            data = await self._repository.get_data_async(*args, **kwargs)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка доступа к базе данных: {str(e)}",
            )

        if not data or len(data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "Отсутствуют данные в базе данных для выбранного периода",
                    "severity": "warning",
                },
            )

        # Total consumption per metric key, e.g. {"energyActiveTotal": 12345, "energyReactiveTotal": 678}
        total_consumption: dict[str, int] = defaultdict(int)
        for row in data:
            for key, metric in row.metrics.items():
                if metric.consumption is not None:
                    total_consumption[key] += metric.consumption

        # Monthly breakdown, now nested per metric key
        monthly_data: OrderedDict[str, list] = OrderedDict()
        monthly_totals: OrderedDict[str, dict[str, int]] = OrderedDict()
        for row in data:
            month_key = row.day.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = []
                monthly_totals[month_key] = defaultdict(int)
            monthly_data[month_key].append(row)
            for key, metric in row.metrics.items():
                if metric.consumption is not None:
                    monthly_totals[month_key][key] += metric.consumption

        # Convert defaultdicts to plain dicts before passing to the template —
        # Jinja handles plain dicts more predictably (e.g. with .items(), 'in' checks)
        total_consumption = dict(total_consumption)
        monthly_totals = OrderedDict((k, dict(v)) for k, v in monthly_totals.items())

        html_content = template_env.get_template(f"{self.report_name}.html").render(
            *args,
            **kwargs,
            monthly_data=monthly_data,
            monthly_totals=monthly_totals,
            total_consumption=total_consumption,
            templates_dir=templates_dir,
        )

        pdf_bytes = HTML(string=html_content).write_pdf()
        filename = f"{self.report_name}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename

