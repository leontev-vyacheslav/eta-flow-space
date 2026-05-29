from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ReportResponseModel(BaseModel):
    id: int
    code: str | None
    description: str | None
    device_id: int | None
    url: str | None
    settings: dict | None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,  # allows using snake_case field names when constructing the object
        from_attributes=True,  # enables ORM mode (formerly orm_mode)
    )
