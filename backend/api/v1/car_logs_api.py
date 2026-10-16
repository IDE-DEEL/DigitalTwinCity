from fastapi import APIRouter, Depends, HTTPException

from backend.api.v1.car_logs_dependencies import get_car_logs_service
from backend.services.car_logs_service import (
    CarLogsService,
    CarNotFoundError,
    TrackSegmentNotFoundError,
    CarLogsNotFoundError,
)

router = APIRouter()


@router.post("/car-logs", response_model=None)
def log_rfid_tag(car_id: str, rfid_tag: str,
                 service: CarLogsService = Depends(get_car_logs_service)):
    """
    Car reports its current RFID tag (track segment).
    This logs the position and updates the car's current segment.
    The routing logic (direction + allowed_to_drive) can be added here.
    """
    try:
        service.log_rfid_tag(car_id, rfid_tag)
    except CarNotFoundError:
        raise HTTPException(status_code=404, detail="Car not found") from None
    except TrackSegmentNotFoundError:
        raise HTTPException(status_code=404, detail="Track segment not found") from None
    return {"message": "Position logged", "car_id": car_id, "segment": rfid_tag}


@router.get("/car-logs/{car_id}", response_model=None)
def get_car_logs(car_id: str, service: CarLogsService = Depends(get_car_logs_service)):
    """Get the full position history of a car."""
    try:
        return service.get_car_logs(car_id)
    except CarLogsNotFoundError:
        raise HTTPException(status_code=404, detail="No logs found for this car") from None
