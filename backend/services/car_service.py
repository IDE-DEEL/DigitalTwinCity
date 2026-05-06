from fastapi import Depends
from sqlalchemy.orm import Session
from backend.data.db.database import get_db
from backend.data.repositories.car_repo import CarRepository

class CarService:
    def __init__(self, car_repo: CarRepository):
        self.car_repo = CarRepository()

def get_car_service(db: Session = Depends(get_db)) -> CarService:
    repo = CarRepository(db)
    return CarService(repo)