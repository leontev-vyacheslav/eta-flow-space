from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.auth import verify_token
from app.services.devices.spring2.accounting_sheet_gas_meter_report_service import AccountingSheetGasMeterReportService
from app.repositories.devices.spring2.accounting_sheet_gas_meter_repository import AccountingSheetGasMeterRepository
from app.models.period_types import PeriodTypes

router = APIRouter()


@router.get("/device/spring2/accounting-sheets/gas-meter")
async def get_accounting_sheet_gas_meter_report(
    period_type: PeriodTypes = Query(alias="periodType", default=PeriodTypes.month),
    device_id: int | None = Query(alias="deviceId", default=None),
    time_zone: str = Query(alias="timezone", default="Europe/Moscow"),
    token_payload: dict = Depends(verify_token),
    repository: AccountingSheetGasMeterRepository = Depends(AccountingSheetGasMeterRepository),
    service=Depends(AccountingSheetGasMeterReportService),
):
    data = await repository.get_data_async(user_id=token_payload["userId"], period_type=period_type, device_id=device_id, time_zone=time_zone)

    pdf_bytes, filename = service.render(
        data=data,
        period_type=period_type,
        device_id=device_id,
        time_zone=time_zone,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
