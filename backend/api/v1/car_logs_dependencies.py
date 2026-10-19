from fastapi import Depends
from sqlalchemy.orm import Session

from backend.data.db.database import get_db
from backend.data.repositories.car_logs_repo import CarLogsRepository
from backend.data.repositories.car_repo import CarRepository
from backend.data.repositories.track_segment_repo import TrackSegmentRepository
from backend.services.car_logs_service import CarLogsService


def get_car_logs_service(db: Session = Depends(get_db)) -> CarLogsService:
    return CarLogsService(
        car_repo=CarRepository(db),
        logs_repo=CarLogsRepository(db),
        segment_repo=TrackSegmentRepository(db),
        transaction=db.begin,
    )
