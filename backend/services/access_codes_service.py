import secrets
import string
import logging
from datetime import datetime
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt

from backend.data.db.database import get_db
from backend.data.repositories.access_codes_repo import AccessCodesRepository
from backend.domain.access_codes import AccessCode
from backend.schemas.access_codes import AccessCodeCreate
from backend.services.access_code_lookup import build_access_code_lookup_hash

logger = logging.getLogger(__name__)

ACCESS_CODE_ALPHABET = string.ascii_uppercase + string.digits
ACCESS_CODE_GROUP_LENGTH = 5


def generate_access_code() -> str:
    left = ''.join(secrets.choice(ACCESS_CODE_ALPHABET) for _ in range(ACCESS_CODE_GROUP_LENGTH))
    right = ''.join(secrets.choice(ACCESS_CODE_ALPHABET) for _ in range(ACCESS_CODE_GROUP_LENGTH))
    return f"{left}-{right}"


class AccessCodesService:
    def __init__(self, repo: AccessCodesRepository):
        self.repo = repo

    def get_all(self):
        return self.repo.find_all()

    def create_code(self, data: AccessCodeCreate):
        raw_code = generate_access_code()

        salt = bcrypt.gensalt()
        hashed_bytes = bcrypt.hashpw(raw_code.encode('utf-8'), salt)
        hashed_code_str = hashed_bytes.decode('utf-8')

        new_code = AccessCode(
            name=data.name,
            code_hash=hashed_code_str,
            code_lookup_hash=build_access_code_lookup_hash(raw_code),
            expires_at=data.expires_at,
            is_revoked=False
        )
        saved_code = self.repo.add(new_code)
        
        logger.info(f"Nieuwe toegangscode aangemaakt: '{saved_code.name}' (ID: {saved_code.id})")
        saved_code.raw_code = raw_code 
        return saved_code

    def revoke_code(self, code_id: int):
        code = self.repo.find_by_id(code_id)
        if not code:
            raise HTTPException(status_code=404, detail="Toegangscode niet gevonden")
        
        code.is_revoked = True
        updated_code = self.repo.update(code)
        logger.info(f"Toegangscode ingetrokken: '{updated_code.name}' (ID: {updated_code.id})")
        return updated_code

    def extend_code(self, code_id: int, new_expiry: datetime):
        code = self.repo.find_by_id(code_id)
        if not code:
            raise HTTPException(status_code=404, detail="Toegangscode niet gevonden")
        
        code.expires_at = new_expiry
        updated_code = self.repo.update(code)
        logger.info(f"Toegangscode verlengd: '{updated_code.name}' (ID: {updated_code.id}) tot {new_expiry}")
        return updated_code

    def delete_code(self, code_id: int):
        code = self.repo.find_by_id(code_id)
        if not code:
            raise HTTPException(status_code=404, detail="Toegangscode niet gevonden")

        code_name = code.name
        self.repo.delete(code)
        logger.info(f"Toegangscode verwijderd: '{code_name}' (ID: {code_id})")

def get_access_codes_service(db: Session = Depends(get_db)) -> AccessCodesService:
    repo = AccessCodesRepository(db)
    return AccessCodesService(repo)
