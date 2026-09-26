from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import verify_token
from app.db.database import get_db

from app.data_models.report import Report
from app.data_models.user_device_link import UserDeviceLink
from app.models.report_response_model import ReportResponseModel

router = APIRouter()


@router.get("/reports/{report_id}", response_model=ReportResponseModel)
async def get_reports_async(
    report_id: int,
    token_payload: dict = Depends(verify_token),
    session: AsyncSession = Depends(get_db),
):
    query = await session.execute(select(Report).where(Report.id == report_id))
    report = query.scalars().one_or_none()

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Отчет не найден",
                "severity": "warning",
            },
        )

    if report.device_id is not None:
        link_query = await session.execute(
            select(UserDeviceLink.id).where(
                UserDeviceLink.user_id == token_payload.get("userId"),
                UserDeviceLink.device_id == report.device_id,
            )
        )
        if link_query.first() is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "message": "Отсутствуют права доступа к устройству",
                    "severity": "warning",
                },
            )

    return report
