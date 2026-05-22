from sqlalchemy.orm import Mapped, mapped_column
from backend.data.db.database import Base

class Results(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True, index=True)
    score: Mapped[int] = mapped_column(index=True, default=0)