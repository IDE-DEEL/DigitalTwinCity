from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.database import Base


class CarCommands(Base):
    __tablename__ = "car_commands"

    car_id = Column(String, primary_key=True, index=True)
    direction = Column(Integer, nullable=True)
    allowed_to_drive = Column(Boolean, nullable=False, default=False)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    current_segment_id = Column(String, ForeignKey("track_segment.segment_id"), nullable=True)

    # A car_command occupies zero or one track segment
    current_segment = relationship("TrackSegment", backref="occupied_by")