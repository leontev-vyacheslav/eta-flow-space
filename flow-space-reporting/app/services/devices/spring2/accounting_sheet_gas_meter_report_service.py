from datetime import datetime, timezone

from weasyprint import HTML


class AccountingSheetGasMeterReportService:
    def render(self):
        html_content = """
        <html>
            <body>
                <h1>Gas meter report</h1>
            </body>
        </html>
        """
        pdf_bytes = HTML(string=html_content).write_pdf()

        filename = f"accounting_sheet_gas_meter_report_service_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"

        return pdf_bytes, filename
