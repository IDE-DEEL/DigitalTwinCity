from typing import List
from fastapi import APIRouter, Depends, HTTPException, Security, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from backend.core.config import settings

from backend.schemas.access_codes import (
    AccessCodeResponse, AccessCodeCreate, AccessCodeCreateResponse, AccessCodeUpdate
)
from backend.services.access_codes_service import AccessCodesService, get_access_codes_service

router = APIRouter(prefix="/admin/access-codes", tags=["admin-access-codes"])
security = HTTPBearer()

def verify_admin(credentials: HTTPAuthorizationCredentials = Security(security)):
    try:
        # Decode the token and verify if the role is "admin"
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Niet geautoriseerd")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessie is verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldige token")

@router.get("/", response_model=List[AccessCodeResponse], dependencies=[Depends(verify_admin)])
async def get_all_codes(service: AccessCodesService = Depends(get_access_codes_service)):
    return service.get_all()

@router.post("/", response_model=AccessCodeCreateResponse, dependencies=[Depends(verify_admin)])
async def create_code(data: AccessCodeCreate, service: AccessCodesService = Depends(get_access_codes_service)):
    return service.create_code(data)

@router.put("/{id}/revoke", response_model=AccessCodeResponse, dependencies=[Depends(verify_admin)])
async def revoke_code(id: int, service: AccessCodesService = Depends(get_access_codes_service)):
    return service.revoke_code(id)

@router.put("/{id}/extend", response_model=AccessCodeResponse, dependencies=[Depends(verify_admin)])
async def extend_code(id: int, data: AccessCodeUpdate, service: AccessCodesService = Depends(get_access_codes_service)):
    if not data.expires_at:
        raise HTTPException(status_code=400, detail="Er moet een nieuwe vervaldatum worden opgegeven in de body.")
    return service.extend_code(id, data.expires_at)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_admin)])
async def delete_code(id: int, service: AccessCodesService = Depends(get_access_codes_service)):
    service.delete_code(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)