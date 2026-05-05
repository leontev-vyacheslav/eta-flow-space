from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.auth import verify_token
from app.services.devices.spring2.accounting_sheet_gas_meter_report_service import AccountingSheetGasMeterReportService

router = APIRouter()


@router.get("/device/spring2/accounting-sheets/gas-meter")
async def get_device_spring2_accounting_sheet_gas_meter_report(
    time_zone: str = Query(alias="timezone", default="Europe/Moscow"),
    token_payload: dict = Depends(verify_token),
    service=Depends(AccountingSheetGasMeterReportService),
):
    pdf_bytes, filename =service.render()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
