from fastapi import APIRouter
from app.modules.common.controller import router as common_router
from app.modules.devices.irvis.controller import router as device_irvis_router

router = APIRouter()
router.include_router(device_irvis_router)
router.include_router(common_router)
