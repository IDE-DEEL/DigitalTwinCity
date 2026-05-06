from fastapi import Depends, HTTPException, Request
import jwt

from backend.core.config import settings


def verify_access_token(
    request: Request,
):
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Ongeldige token")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
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
