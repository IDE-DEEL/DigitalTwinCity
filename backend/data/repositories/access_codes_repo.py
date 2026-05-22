from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.domain.access_codes import AccessCode

class AccessCodesRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_all(self) -> List[AccessCode]:
        return self.db.query(AccessCode).order_by(AccessCode.created_at.desc()).all()

    def find_active_code_by_lookup_hash(self, code_lookup_hash: str) -> Optional[AccessCode]:
        now = datetime.now(timezone.utc)
        return self.db.query(AccessCode).filter(
            AccessCode.is_revoked.is_(False),
            AccessCode.expires_at > now,
            AccessCode.code_lookup_hash == code_lookup_hash,
        ).one_or_none()

    def find_by_id(self, code_id: int) -> Optional[AccessCode]:
        return self.db.get(AccessCode, code_id)

    def add(self, access_code: AccessCode) -> AccessCode:
        self.db.add(access_code)
        self.db.commit()
        self.db.refresh(access_code)
        return access_code

    def update(self, access_code: AccessCode) -> AccessCode:
        self.db.commit()
        self.db.refresh(access_code)
        return access_code

    def delete(self, access_code: AccessCode) -> None:
        self.db.delete(access_code)
        self.db.commit()
