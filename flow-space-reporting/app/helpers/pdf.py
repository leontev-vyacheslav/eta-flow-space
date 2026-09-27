from fastapi.concurrency import run_in_threadpool
from weasyprint import HTML


def _render_pdf(html_content: str) -> bytes:
    return HTML(string=html_content).write_pdf()


async def render_pdf_async(html_content: str) -> bytes:
    # WeasyPrint is synchronous and CPU-heavy; run it in the threadpool so it doesn't block the event loop
    return await run_in_threadpool(_render_pdf, html_content)
