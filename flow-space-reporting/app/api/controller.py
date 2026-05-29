from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db

from app.data_models.report import Report
from app.models.report_response_model import ReportResponseModel

router = APIRouter()


@router.get("/reports/{report_id}", response_model=ReportResponseModel)
async def get_reports_async(report_id: int, session: AsyncSession = Depends(get_db)):
    query = await session.execute(select(Report).where(Report.id == report_id))
    report = query.scalars().one_or_none()

    return report
