from sqlalchemy import Column, String
from backend.data.db.database import Base


class TrackSegment(Base):
    __tablename__ = "track_segment"

    segment_id = Column(String, primary_key=True, index=True)
    status = Column(String, nullable=True)
