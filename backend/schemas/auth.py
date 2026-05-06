from pydantic import BaseModel

class LoginRequest(BaseModel):
    code: str

# Admin login payload.
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class SessionResponse(BaseModel):
    session_name: str
