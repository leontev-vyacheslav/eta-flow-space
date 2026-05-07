from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.auth import verify_token
from app.modules.devices.spring2.accounting_sheet_gas_meter.service import AccountingSheetGasMeterReportService
from app.models.period_types import PeriodTypes

router = APIRouter()


@router.get("/device/spring2/accounting-sheets/gas-meter")
async def get_accounting_sheet_gas_meter_report_async(
    period_type: PeriodTypes = Query(alias="periodType", default=PeriodTypes.month),
    device_id: int | None = Query(alias="deviceId", default=None),
    time_zone: str = Query(alias="timezone", default="Europe/Moscow"),
    token_payload: dict = Depends(verify_token),
    service: AccountingSheetGasMeterReportService = Depends(AccountingSheetGasMeterReportService),
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
