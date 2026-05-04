from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Response
import jwt

from backend.schemas.auth import LoginRequest, AdminLoginRequest, SessionResponse
from backend.services.auth_service import AuthService, get_auth_service
from backend.core.config import settings
from backend.api.v1.auth_dependencies import verify_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

def set_session_cookie(response: Response, token: str, expires_at: datetime) -> None:
    max_age = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 0)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age,
        expires=expires_at,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        domain=settings.session_cookie_domain,
        path="/",
    )

# -- Existing student login --
@router.post("/verify-code", response_model=SessionResponse)
async def verify_code(
    request: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    token, session_name = service.verify_and_login(request)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    set_session_cookie(response, token, expires_at)
    return SessionResponse(session_name=session_name)

@router.get("/session")
async def get_session(payload: dict = Depends(verify_access_token)):
    return {
        "session_name": payload.get("name"),
        "role": payload.get("role", "user"),
        "expires_at": payload.get("exp"),
    }

# -- Admin login --
@router.post("/admin-login", response_model=SessionResponse)
async def admin_login(request: AdminLoginRequest, response: Response):
    # Verify if credentials match the .env configuration
    if request.username != settings.ADMIN_USERNAME or request.password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Ongeldige gebruikersnaam of wachtwoord")

    # Generate a secure session token
    expire = datetime.now(timezone.utc) + timedelta(minutes=120)
    to_encode = {
        "sub": "admin", 
        "name": "Beheerder",
        "role": "admin", # Used to identify the user as an admin
        "exp": expire
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

    set_session_cookie(response, encoded_jwt, expire)
    return SessionResponse(session_name="Beheerder")
