from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any
from fastapi import HTTPException, status
from fastapi.params import Depends
from jinja2 import Environment, FileSystemLoader
import pytz
from weasyprint import HTML

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

        html_content = template_env.get_template(f"{self.report_name}.html").render(
            *args,
            **kwargs,
            data=data,
            templates_dir=templates_dir,
        )

        pdf_bytes = HTML(string=html_content).write_pdf()
        filename = f"{self.report_name}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename
