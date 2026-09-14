from pydantic import BaseModel


class MetricValueModel(BaseModel):
    value: int | None
    consumption: int | None
