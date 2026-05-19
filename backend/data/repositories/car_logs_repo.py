from typing import Optional, List
from sqlalchemy.orm import Session
from backend.domain.car_logs import CarLogs


class CarLogsRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_all(self) -> List[CarLogs]:
        return self.db.query(CarLogs).order_by(CarLogs.created_at.desc()).all()

    def find_by_id(self, log_id: int) -> Optional[CarLogs]:
        return self.db.get(CarLogs, log_id)

    def find_by_car_id(self, car_id: str) -> List[CarLogs]:
        return (
            self.db.query(CarLogs)
            .filter(CarLogs.car_id == car_id)
            .order_by(CarLogs.created_at.desc())
            .all()
        )

    def find_by_rfid_tag(self, rfid_tag: str) -> List[CarLogs]:
        return (
            self.db.query(CarLogs)
            .filter(CarLogs.rfid_tag == rfid_tag)
            .order_by(CarLogs.created_at.desc())
            .all()
        )

    def add(self, log: CarLogs) -> CarLogs:
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def delete(self, log: CarLogs) -> None:
        self.db.delete(log)
        self.db.commit()