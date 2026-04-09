from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
import pytz

from app.data_models import UserRoles
from app.auth import verify_token
from app.repositories.emergency_repository import EmergencyRepository
from app.services.emergency_report_service import EmergencySummaryReportService

router = APIRouter()


@router.get("/emergency-summary")
async def get_emergency_summary_report(
    time_zone: str = Query(alias="timezone", default="Europe/Moscow"),
    token_payload: dict = Depends(verify_token),
    repository: EmergencyRepository = Depends(EmergencyRepository),
    service=Depends(EmergencySummaryReportService),
):

    if time_zone not in pytz.all_timezones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {time_zone}",
        )

    user_id = token_payload.get("userId")
    assert isinstance(user_id, int), "userId in token payload must be an integer"

    is_admin = (
        token_payload.get("roleId", UserRoles.USER.value) == UserRoles.ADMIN.value
    )

    try:
        rows = await repository.get_emergency_summary_by_month(user_id, time_zone)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No emergency data found for this user",
        )

    pdf_bytes, filename = service.render(rows, is_admin)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
