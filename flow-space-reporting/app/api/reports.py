from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func, cast, Integer, true, column, literal_column
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from datetime import datetime
from babel.dates import format_date, format_datetime
import pytz
from weasyprint import HTML

from app.config import settings
from app.db.database import get_db
from app.models import Device, EmergencyState, UserDeviceLink
from app.auth import verify_token

router = APIRouter()

templates_dir = Path(__file__).parent.parent / "reports"
template_env = Environment(loader=FileSystemLoader(templates_dir))


def locale_format_datetime(value, time_zone: str = "UTC", format="short"):
    """Format datetime with locale and timezone from settings."""
    if value is None:
        return "N/A"

    if isinstance(value, datetime):
        return format_datetime(value, format, locale=settings.REPORT_LOCALE)

    return str(value)


def locale_format_month(value, locale="ru_RU"):
    if not value:
        return "N/A"

    return format_date(value, format="LLLL yyyy", locale=locale)


template_env.filters["locale_format_datetime"] = locale_format_datetime
template_env.filters["locale_format_month"] = locale_format_month


@router.get("/emergency-summary")
async def generate_emergency_summary_report(
    time_zone: str = Query(alias="timezone", default="UTC"),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """Generate a PDF report for emergency state summary by month."""
    user_id = token_payload.get("userId")
    is_admin = token_payload.get("roleId", 2) == 1;

    reasons_table = (
        func.json_array_elements(EmergencyState.state["reasons"])
        .table_valued(column("reason"), name="reason")
        .lateral("reason")
    )

    created_at_tz = func.timezone(time_zone, EmergencyState.created_at)

    select_query = (
        select(
            EmergencyState.device_id,
            Device.name.label("device_name"),
            func.date_trunc("month", created_at_tz).label("month"),
            literal_column("reason->>'description'").label("emergency_type"),
            cast(literal_column("(reason->>'id')"), Integer).label("reason_id"),
            func.count().label("occurrences"),
            func.min(created_at_tz).label("first_occurrence"),
            func.max(created_at_tz).label("last_occurrence"),
        )
        .select_from(EmergencyState)
        .join(Device, EmergencyState.device_id == Device.id)
        .join(UserDeviceLink, Device.id == UserDeviceLink.device_id)
        .join(reasons_table, true())
        .where(UserDeviceLink.user_id == user_id)
        .group_by(
            EmergencyState.device_id,
            Device.name,
            "month",
            "reason_id",
            "emergency_type",
        )
        .order_by(
            text("month"),
            EmergencyState.device_id,
            text("reason_id"),
            text("occurrences DESC"),
        )
    )

    result = await db.execute(select_query)
    rows = result.fetchall()

    # Group data by device_id, device_name, and month
    grouped_data = {}
    for row in rows:
        key = (row.device_id, row.device_name, row.month)
        if key not in grouped_data:
            grouped_data[key] = []
        grouped_data[key].append(row)

    # Sort groups by month, then device_id
    sorted_groups = sorted(
        grouped_data.items(), key=lambda x: (x[0][2] or "", x[0][0] or 0)
    )

    template = template_env.get_template("emergency_summary_report.html")
    html_content = template.render(
        grouped_data=dict(sorted_groups),
        templates_dir=templates_dir.as_uri(),
        time_zone=time_zone,
        is_admin=is_admin,
    )

    pdf_bytes = HTML(string=html_content).write_pdf()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=emergency_summary_report.pdf"
        },
    )
