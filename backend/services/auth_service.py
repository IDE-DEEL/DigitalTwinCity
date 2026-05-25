import logging
from datetime import timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.data.db.database import get_db
from backend.data.repositories.access_codes_repo import AccessCodesRepository
from backend.domain.access_codes import AccessCode
from backend.schemas.auth import LoginRequest
from backend.services.access_code_lookup import build_access_code_lookup_hash, normalize_access_code

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, repo: AccessCodesRepository):
        self.repo = repo

    def verify_and_login(self, request: LoginRequest) -> tuple[str, str]:
        raw_code = request.code.strip()
        matched_code = None

        for candidate_code in dict.fromkeys([raw_code, normalize_access_code(raw_code)]):
            lookup_hash = build_access_code_lookup_hash(candidate_code)
            matched_code = self.repo.find_active_code_by_lookup_hash(lookup_hash)

            if matched_code and self._code_matches(candidate_code, matched_code):
                break

            matched_code = None

        if not matched_code:
            logger.warning("Mislukte inlogpoging met een ongeldige of verlopen code.")
            raise HTTPException(
                status_code=401,
                detail="De ingevoerde toegangscode is ongeldig, verlopen, of ingetrokken.",
            )

        code_expiry = matched_code.expires_at
        if code_expiry.tzinfo is None:
            code_expiry = code_expiry.replace(tzinfo=timezone.utc)

        to_encode = {
            "sub": f"code_{matched_code.id}",
            "name": matched_code.name,
            "exp": code_expiry,
        }

        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
        logger.info(f"Succesvolle login met code: '{matched_code.name}'")

        return encoded_jwt, matched_code.name

    def _code_matches(self, raw_code: str, db_code: AccessCode) -> bool:
        try:
            return bcrypt.checkpw(raw_code.encode("utf-8"), db_code.code_hash.encode("utf-8"))
        except Exception as e:
            # Skip corrupt database hashes instead of crashing the login flow.
            logger.error(f"Sla corrupte hash over voor ID {db_code.id}: {e}")
            return False


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    repo = AccessCodesRepository(db)
    return AuthService(repo)
