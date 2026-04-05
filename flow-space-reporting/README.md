# Flow Space Reporting

Reporting service for Eta Flow Space platform.

## Stack

- **FastAPI** - Async web framework
- **SQLAlchemy[asyncio]** - Async ORM
- **asyncpg** - Async PostgreSQL driver
- **WeasyPrint** - PDF generation

## Setup

```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health-check` | Health check |
| `GET` | `/api/reports/device-state/{device_id}` | Generate device state PDF report |

## Project Structure

```
flow-space-reporting/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── reports.py      # Report generation endpoints
│   │   └── router.py       # API router aggregation
│   ├── db/
│   │   ├── __init__.py
│   │   └── database.py     # Async database connection
│   ├── __init__.py
│   └── config.py           # Application settings
├── .env.example
├── .gitignore
├── main.py                 # FastAPI application entry point
├── pyproject.toml
└── requirements.txt
```
