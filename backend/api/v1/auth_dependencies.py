from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from backend.core.config import settings

security = HTTPBearer(auto_error=False)


def verify_access_token(credentials: HTTPAuthorizationCredentials | None = Security(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Ongeldige token")

    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Ongeldige token")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessie is verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")


def verify_admin(payload: dict = Depends(verify_access_token)):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Niet geautoriseerd")

    return payload
