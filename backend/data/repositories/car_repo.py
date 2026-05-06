from sqlalchemy.orm import Session

class CarRepository:
    def __init__(self, db: Session):
        self.db = db