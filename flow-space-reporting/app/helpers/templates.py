import functools
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.helpers.formatters import (
    format_number,
    locale_format_date,
    locale_format_datetime,
    locale_format_month,
    locale_format_month_name,
    period_type_title_format,
)

# Filters available in every report template
FILTERS = [
    locale_format_date,
    locale_format_datetime,
    locale_format_month,
    locale_format_month_name,
    period_type_title_format,
    format_number,
]


@functools.cache
def get_template_env(templates_dir: Path) -> Environment:
    # One Environment per template directory, shared across requests, so compiled templates stay cached
    env = Environment(loader=FileSystemLoader(templates_dir))
    for filter in FILTERS:
        env.filters[filter.__name__] = filter
    return env
