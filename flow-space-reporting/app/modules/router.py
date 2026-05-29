from fastapi import APIRouter
from app.modules.common.controller import router as common_router
from app.modules.devices.spring2.controller import router as device_spring2_router

router = APIRouter()
router.include_router(device_spring2_router)
router.include_router(common_router)
