from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer
from app.api.router import router
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="FlowSpace Reporting",
    description="Reporting service for Eta FlowSpace",
    version="0.1.0",
    docs_url=None,
    openapi_url="/openapi.json",
)
bearer_scheme = HTTPBearer()

app.include_router(router, prefix="/api")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def default():
    return RedirectResponse(url="/docs")


@app.get("/health-check")
async def health_check():
    return {"status": "ok"}


@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",  # points to Nginx path
        title=app.title,
        swagger_favicon_url="/static/favicon.ico",
    )
