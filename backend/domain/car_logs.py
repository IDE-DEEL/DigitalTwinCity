from sqlalchemy import Column, Integer, String, DateTime
from backend.db.database import Base


class CarLogs(Base):
    __tablename__ = "car_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    car_id = Column(String, nullable=True)
    rfid_tag = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)