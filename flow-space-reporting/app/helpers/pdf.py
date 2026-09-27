from pathlib import Path

from fastapi.concurrency import run_in_threadpool
from weasyprint import CSS, HTML
from weasyprint.text.fonts import FontConfiguration

# @font-face rules for the fonts bundled with the templates, shared by every report
FONTS_CSS_PATH = Path(__file__).parent.parent / "templates/assets/fonts/fonts.css"


def _render_pdf(html_content: str) -> bytes:
    font_config = FontConfiguration()
    fonts_css = CSS(filename=FONTS_CSS_PATH, font_config=font_config)
    return HTML(string=html_content).write_pdf(stylesheets=[fonts_css], font_config=font_config)


async def render_pdf_async(html_content: str) -> bytes:
    # WeasyPrint is synchronous and CPU-heavy; run it in the threadpool so it doesn't block the event loop
    return await run_in_threadpool(_render_pdf, html_content)
