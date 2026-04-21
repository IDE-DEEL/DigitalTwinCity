import logging
from datetime import timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.data.db.database import get_db
from backend.data.repositories.access_codes_repo import AccessCodesRepository
from backend.schemas.auth import LoginRequest, TokenResponse

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, repo: AccessCodesRepository):
        self.repo = repo

    def verify_and_login(self, request: LoginRequest) -> TokenResponse:
        active_codes = self.repo.find_active_codes()

        matched_code = None
        for db_code in active_codes:
            try:
                if bcrypt.checkpw(request.code.encode("utf-8"), db_code.code_hash.encode("utf-8")):
                    matched_code = db_code
                    break
            except Exception as e:
                # Skip corrupt database hashes instead of crashing the login flow.
                logger.error(f"Sla corrupte hash over voor ID {db_code.id}: {e}")
                continue

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

        return TokenResponse(
            access_token=encoded_jwt,
            token_type="bearer",
            session_name=matched_code.name,
        )


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    repo = AccessCodesRepository(db)
    return AuthService(repo)
