from fastapi import APIRouter
from app.api.common.emergency_reports import router as emergency_reports_router
from app.api.devices.spring2.reports import router as spring2_reports_router

router = APIRouter()
router.include_router(emergency_reports_router)
router.include_router(spring2_reports_router)
