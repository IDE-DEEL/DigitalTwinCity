from typing import Optional, List
from sqlalchemy.orm import Session
from backend.domain.track_segment import TrackSegment


class TrackSegmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_all(self) -> List[TrackSegment]:
        return self.db.query(TrackSegment).all()

    def find_by_id(self, segment_id: str) -> Optional[TrackSegment]:
        return self.db.get(TrackSegment, segment_id)

    def add(self, segment: TrackSegment) -> TrackSegment:
        self.db.add(segment)
        self.db.commit()
        self.db.refresh(segment)
        return segment
