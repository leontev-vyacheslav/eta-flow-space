from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import HTTPException, status
from fastapi.params import Depends
from jinja2 import Environment, FileSystemLoader
import pytz
from weasyprint import HTML

from app.modules.common.emergency_summary.models import EmergencySummaryReportRowModel
from app.models.period_types import PeriodTypes
from app.modules.common.emergency_summary.repository import EmergencySummaryRepository
from app.modules.formatters import *
from app.modules.helpers import is_admin

templates_dir = Path(__file__).parent.parent.parent.parent / "templates/common"
template_env = Environment(loader=FileSystemLoader(templates_dir))

filters = [
    locale_format_date,
    locale_format_datetime,
    locale_format_month,
    period_type_title_format,
    period_type_group_format,
]

for filter in filters:
    template_env.filters[filter.__name__] = filter


class EmergencySummaryReportService:
    report_name = "emergency_summary_report"

    def __init__(self, repository: Annotated[EmergencySummaryRepository, Depends(EmergencySummaryRepository)]) -> None:
        self._repository = repository

    def __group_data(
        self,
        rows: list[EmergencySummaryReportRowModel],
    ) -> list[tuple[tuple[datetime | None, datetime | None], list[tuple[tuple[int, str], list[EmergencySummaryReportRowModel]]]]]:
        # First level: group by period range
        period_groups: dict[tuple[datetime | None, datetime | None], dict[tuple[int, str], list[EmergencySummaryReportRowModel]]] = {}
        for row in rows:
            period_key = (row.period_begin, row.period_end)
            if period_key not in period_groups:
                period_groups[period_key] = {}

            device_key = (row.device_id, row.device_name)
            if device_key not in period_groups[period_key]:
                period_groups[period_key][device_key] = []
            period_groups[period_key][device_key].append(row)

        # Sort: first by period_begin, then by device_id within each period
        result = []
        for period_key in sorted(period_groups.keys(), key=lambda x: x[0] or datetime.min):
            device_groups = period_groups[period_key]
            sorted_device_groups = sorted(device_groups.items(), key=lambda x: x[0][0] or 0)
            result.append((period_key, sorted_device_groups))

        return result

    async def render_async(self, *args: Any, **kwargs: Any) -> tuple[bytes | None, str]:
        token_payload: dict = kwargs["token_payload"]
        time_zone: str = kwargs["time_zone"]
        device_id: int | None = kwargs.get("device_id")
        period_type: PeriodTypes = kwargs["period_type"]

        is_admin_role = is_admin(token_payload)

        if time_zone not in pytz.all_timezones:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid timezone: {time_zone}",
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
                detail="Нет данных для отчета",
            )

        grouped_data = self.__group_data(data)

        device_name = data[0].device_name if data and len(data) > 0 and device_id is not None else f"все устройства"

        html_content = template_env.get_template(f"{self.report_name}.html").render(
            data=grouped_data,
            templates_dir=templates_dir,
            is_admin=is_admin_role,
            period_type=period_type.value,
            device_name=device_name,
        )

        pdf_bytes = HTML(string=html_content).write_pdf()
        filename = f"{self.report_name}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename
