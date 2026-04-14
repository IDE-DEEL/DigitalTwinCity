from typing import Optional
from sqlalchemy.orm import Session
from backend.domain.results import Results


class ResultsRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- ORM Operaties ---
    def find_results_by_id(self, results_id: int) -> Optional[Results]:
        return self.db.get(Results, results_id)

    def find_all_results(self) -> list[type[Results]]:
        return self.db.query(Results).all()

    def add_results(self):
        new_results = Results()
        self.db.add(new_results)
        self.db.commit()
        self.db.refresh(new_results)

        return new_results
