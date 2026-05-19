from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.data.db.database import get_db
from backend.repositories.car_repo import CarRepository
from backend.domain.car_commands import CarCommands

router = APIRouter()


@router.get("/car-commands/{car_id}", response_model=None)
def get_car_commands(car_id: str, db: Session = Depends(get_db)):
    """Car polls this endpoint to get its next direction and whether it is allowed to drive."""
    repo = CarRepository(db)
    car = repo.find_by_id(car_id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car


@router.post("/car-commands", response_model=None)
def register_car(car_id: str, db: Session = Depends(get_db)):
    """Register a new car on the track."""
    repo = CarRepository(db)
    new_car = CarCommands(
        car_id=car_id,
        direction=0,
        allowed_to_drive=False,
        current_segment_id=None
    )
    return repo.add(new_car)


@router.put("/car-commands/{car_id}", response_model=None)
def update_car_commands(
    car_id: str,
    direction: int = None,
    allowed_to_drive: bool = None,
    current_segment_id: str = None,
    db: Session = Depends(get_db)
):
    """Update direction, allowed_to_drive or current segment for a car."""
    repo = CarRepository(db)
    car = repo.find_by_id(car_id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    if direction is not None:
        car.direction = direction
    if allowed_to_drive is not None:
        car.allowed_to_drive = allowed_to_drive
    if current_segment_id is not None:
        car.current_segment_id = current_segment_id
    return repo.update(car)