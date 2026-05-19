from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.data.db.database import get_db
from backend.repositories.car_logs_repo import CarLogsRepository
from backend.repositories.car_repo import CarRepository
from backend.repositories.track_segment_repo import TrackSegmentRepository
from backend.domain.car_logs import CarLogs

router = APIRouter()


@router.post("/car-logs", response_model=None)
def log_rfid_tag(car_id: str, rfid_tag: str, db: Session = Depends(get_db)):
    """
    Car reports its current RFID tag (track segment).
    This logs the position and updates the car's current segment.
    The routing logic (direction + allowed_to_drive) can be added here.
    """
    car_repo = CarRepository(db)
    logs_repo = CarLogsRepository(db)
    segment_repo = TrackSegmentRepository(db)

    # Check if car exists
    car = car_repo.find_by_id(car_id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    # Check if the segment exists
    segment = segment_repo.find_by_id(rfid_tag)
    if not segment:
        raise HTTPException(status_code=404, detail="Track segment not found")

    # Log the position
    new_log = CarLogs(
        car_id=car_id,
        rfid_tag=rfid_tag,
        created_at=datetime.now(timezone.utc)
    )
    logs_repo.add(new_log)

    # Update the car's current segment
    car.current_segment_id = rfid_tag
    car_repo.update(car)

    return {"message": "Position logged", "car_id": car_id, "segment": rfid_tag}


@router.get("/car-logs/{car_id}", response_model=None)
def get_car_logs(car_id: str, db: Session = Depends(get_db)):
    """Get the full position history of a car."""
    repo = CarLogsRepository(db)
    logs = repo.find_by_car_id(car_id)
    if not logs:
        raise HTTPException(status_code=404, detail="No logs found for this car")
    return logs