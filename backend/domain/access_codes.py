from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from backend.data.db.database import Base

class AccessCode(Base):
    __tablename__ = "access_codes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    code_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    code_lookup_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    
    # Timestamp when the code expires
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    
    # Status of the code (True = manually revoked)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Useful for logging and sorting in the admin panel
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
