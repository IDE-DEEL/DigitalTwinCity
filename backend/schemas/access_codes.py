from datetime import datetime
from pydantic import BaseModel, ConfigDict

# Shared fields for access code payloads.
class AccessCodeBase(BaseModel):
    name: str
    expires_at: datetime
    is_revoked: bool = False

# Request payload for creating a new access code.
class AccessCodeCreate(BaseModel):
    name: str
    expires_at: datetime


# Request payload for extending or revoking an access code.
class AccessCodeUpdate(BaseModel):
    expires_at: datetime | None = None
    is_revoked: bool | None = None

# Response payload returned to the frontend.
class AccessCodeResponse(AccessCodeBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Response payload that shows the raw code only once after creation.
class AccessCodeCreateResponse(AccessCodeResponse):
    raw_code: str
