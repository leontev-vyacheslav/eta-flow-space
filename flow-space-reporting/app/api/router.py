from fastapi import APIRouter
from app.api.emergency_reports import router as emergency_reports_router

router = APIRouter()
router.include_router(emergency_reports_router)
