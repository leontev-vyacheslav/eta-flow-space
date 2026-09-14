from app.data_models.enums import UserRoles

def is_admin(token_payload: dict) -> bool:
    user_id = token_payload.get("userId")
    assert isinstance(user_id, int), "userId in token payload must be an integer"

    return token_payload.get("roleId", UserRoles.USER.value) == UserRoles.ADMIN.value