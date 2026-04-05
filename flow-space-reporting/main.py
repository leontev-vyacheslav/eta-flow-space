from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer
from app.api.router import router
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Flow Space Reporting",
    description="Reporting service for Eta Flow Space",
    version="0.1.0",
    docs_url=None,
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
    assert app.openapi_url is not None
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title,
        swagger_favicon_url="/static/favicon.ico",  # your custom icon
    )
