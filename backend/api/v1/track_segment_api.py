from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.data.db.database import get_db
from backend.data.repositories.track_segment_repo import TrackSegmentRepository
from backend.domain.track_segment import TrackSegment

router = APIRouter()


@router.get("/track-segments", response_model=None)
def get_all_segments(db: Session = Depends(get_db)):
    repo = TrackSegmentRepository(db)
    return repo.find_all()


@router.get("/track-segments/{segment_id}", response_model=None)
def get_segment(segment_id: str, db: Session = Depends(get_db)):
    repo = TrackSegmentRepository(db)
    segment = repo.find_by_id(segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Track segment not found")
    return segment


@router.post("/track-segments", response_model=None)
def create_segment(segment_id: str, status: str = "free", db: Session = Depends(get_db)):
    repo = TrackSegmentRepository(db)
    new_segment = TrackSegment(segment_id=segment_id, status=status)
    return repo.add(new_segment)
