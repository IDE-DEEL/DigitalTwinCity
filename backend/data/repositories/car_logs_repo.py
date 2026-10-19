from typing import List
from sqlalchemy.orm import Session
from backend.domain.car_logs import CarLogs


class CarLogsRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_car_id(self, car_id: str) -> List[CarLogs]:
        return (
            self.db.query(CarLogs)
            .filter(CarLogs.car_id == car_id)
            .order_by(CarLogs.created_at.desc())
            .all()
        )

    def add(self, log: CarLogs, *, commit: bool = True) -> CarLogs:
        self.db.add(log)
        if commit:
            self.db.commit()
            self.db.refresh(log)
        else:
            self.db.flush()
        return log
