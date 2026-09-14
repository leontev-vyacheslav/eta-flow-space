from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.auth import verify_token
from app.modules.devices.irvis.accounting_sheet.service import AccountingSheetReportService
from app.models.accounting_period_types import AccountingPeriodTypes

router = APIRouter()


@router.get("/device/irvis/accounting-sheets")
async def get_accounting_sheet_gas_meter_report_async(
    period_type: AccountingPeriodTypes = Query(alias="periodType", default=AccountingPeriodTypes.MONTH),
    device_id: int | None = Query(alias="deviceId", default=None),
    time_zone: str = Query(alias="timezone", default="Europe/Moscow"),
    token_payload: dict = Depends(verify_token),
    service: AccountingSheetReportService = Depends(AccountingSheetReportService),
):

    pdf_bytes, filename = await service.render_async(
        token_payload=token_payload,
        time_zone=time_zone,
        device_id=device_id,
        period_type=period_type,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
