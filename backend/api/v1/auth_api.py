from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
import jwt

from backend.schemas.auth import LoginRequest, AdminLoginRequest, TokenResponse
from backend.services.auth_service import AuthService, get_auth_service
from backend.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# -- Existing student login --
@router.post("/verify-code", response_model=TokenResponse)
async def verify_code(request: LoginRequest, service: AuthService = Depends(get_auth_service)):
    return service.verify_and_login(request)

# -- Admin login --
@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(request: AdminLoginRequest):
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
    
    return TokenResponse(
        access_token=encoded_jwt,
        token_type="bearer",
        session_name="Beheerder"
    )