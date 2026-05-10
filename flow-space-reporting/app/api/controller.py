import time
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db

from app.data_models.report import Report
from app.models.report_response_model import ReportResponseModel

router = APIRouter()


@router.get("/reports", response_model=List[ReportResponseModel])
async def get_reports_async(session: AsyncSession = Depends(get_db)):
    reports = await session.execute(select(Report).where(Report.url.is_not(None)))
    rows = reports.scalars().all()

    return rows
