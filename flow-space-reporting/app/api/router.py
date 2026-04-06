from fastapi import APIRouter
from app.api.reports import router as reports_router

router = APIRouter()
router.include_router(reports_router)
