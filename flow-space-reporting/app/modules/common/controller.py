from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.auth import verify_token
from app.modules.common.emergency_summary.service import EmergencySummaryReportService
from app.models.grouping_period_types import GroupingPeriodTypes

router = APIRouter()


@router.get("/emergency-summary")
async def get_emergency_summary_report_async(
    period_type: GroupingPeriodTypes = Query(alias="periodType", default=GroupingPeriodTypes.MONTH),
    device_id: int | None = Query(alias="deviceId", default=None),
    time_zone: str = Query(alias="timezone", default="Europe/Moscow"),
    date_from: date | None = Query(alias="dateFrom", default=None),
    date_to: date | None = Query(alias="dateTo", default=None),
    token_payload: dict = Depends(verify_token),
    service: EmergencySummaryReportService = Depends(EmergencySummaryReportService),
):
    pdf_bytes, filename = await service.render_async(
        token_payload=token_payload,
        time_zone=time_zone,
        device_id=None if device_id == 0 else device_id,
        period_type=period_type,
        date_from=date_from,
        date_to=date_to,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
