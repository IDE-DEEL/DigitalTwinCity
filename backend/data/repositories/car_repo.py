from typing import Optional, List
from sqlalchemy.orm import Session
from backend.domain.car_commands import CarCommands


class CarRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_all(self) -> List[CarCommands]:
        return self.db.query(CarCommands).all()

    def find_by_id(self, car_id: str) -> Optional[CarCommands]:
        return self.db.get(CarCommands, car_id)

    def find_by_segment(self, segment_id: str) -> Optional[CarCommands]:
        """Return the car currently occupying the given track segment, if any."""
        return (
            self.db.query(CarCommands)
            .filter(CarCommands.current_segment_id == segment_id)
            .one_or_none()
        )

    def add(self, car: CarCommands) -> CarCommands:
        self.db.add(car)
        self.db.commit()
        self.db.refresh(car)
        return car

    def update(self, car: CarCommands) -> CarCommands:
        self.db.commit()
        self.db.refresh(car)
        return car

    def delete(self, car: CarCommands) -> None:
        self.db.delete(car)
        self.db.commit()