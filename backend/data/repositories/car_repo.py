from typing import Optional
from sqlalchemy.orm import Session
from backend.domain.car_commands import CarCommands


class CarRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, car_id: str) -> Optional[CarCommands]:
        return self.db.get(CarCommands, car_id)

    def add(self, car: CarCommands) -> CarCommands:
        self.db.add(car)
        self.db.commit()
        self.db.refresh(car)
        return car

    def update(self, car: CarCommands, *, commit: bool = True) -> CarCommands:
        if commit:
            self.db.commit()
            self.db.refresh(car)
        else:
            self.db.flush()
        return car
