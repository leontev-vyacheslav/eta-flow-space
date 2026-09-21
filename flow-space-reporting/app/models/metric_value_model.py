from pydantic import BaseModel


class MetricValueModel(BaseModel):
    value: float | None
    consumption: float | None
