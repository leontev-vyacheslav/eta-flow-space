from collections import OrderedDict
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any
from fastapi import HTTPException, status
from fastapi.params import Depends
import pytz

from app.helpers.pdf import render_pdf_async
from app.helpers.templates import get_template_env
from app.repositories.accounting_sheet_base_repository import AccountingSheetBaseRepository

logger = logging.getLogger(__name__)


class AccountingSheetReportBaseService:
    report_name = "accounting_sheet_report"

    def __init__(self, repository: Annotated[AccountingSheetBaseRepository, Depends(AccountingSheetBaseRepository)], templates_dir: Path):
        self.templates_dir = templates_dir

        self._repository = repository

        self.template_env = get_template_env(templates_dir)

    async def render_async(self, *args: Any, **kwargs: Any) -> tuple[bytes | None, str]:
        time_zone: str = kwargs["time_zone"]

        if time_zone not in pytz.all_timezones:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Указана неверная временная зона в запросе: {time_zone}",
            )

        try:
            data, device_id, device_name, device_code = await self._repository.get_data_async(*args, **kwargs)
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to load data for %s", self.report_name)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "message": "Ошибка доступа к базе данных",
                    "severity": "error",
                },
            )

        # The query returns a row for every calendar day, so "no data" means no day has any reading
        if not any(metric.value is not None for row in data for metric in row.metrics.values()):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "message": "Отсутствуют данные в базе данных для выбранного периода",
                    "severity": "warning",
                },
            )

        # Consumption totals per metric key, overall and per month. A total stays None ("no data",
        # rendered as "-") until some day has consumption, so a missing value is never reported as 0
        metric_keys = list(data[0].metrics)
        total_consumption: dict[str, float | None] = dict.fromkeys(metric_keys)
        monthly_data: OrderedDict[str, list] = OrderedDict()
        monthly_totals: OrderedDict[str, dict[str, float | None]] = OrderedDict()
        for row in data:
            month_key = row.day.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = []
                monthly_totals[month_key] = dict.fromkeys(metric_keys)
            monthly_data[month_key].append(row)
            for key, metric in row.metrics.items():
                if metric.consumption is not None:
                    total_consumption[key] = (total_consumption[key] or 0.0) + metric.consumption
                    monthly_totals[month_key][key] = (monthly_totals[month_key][key] or 0.0) + metric.consumption

        html_content = self.template_env.get_template(f"{self.report_name}.html").render(
            *args,
            **kwargs,  # device_id
            device_name=device_name,
            device_code=device_code,
            monthly_data=monthly_data,
            monthly_totals=monthly_totals,
            total_consumption=total_consumption,
            templates_dir=self.templates_dir,
        )

        pdf_bytes = await render_pdf_async(html_content)
        filename = f"{self.report_name}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename
