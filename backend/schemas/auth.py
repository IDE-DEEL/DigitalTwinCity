from pydantic import BaseModel

class LoginRequest(BaseModel):
    code: str

# Admin login payload.
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    session_name: str
