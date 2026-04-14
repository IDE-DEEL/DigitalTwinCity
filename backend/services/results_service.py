from backend.data.repositories.results_repo import ResultsRepository
from backend.domain.results import Results

class ResultsService:
    def __init__(self, results_repo: ResultsRepository):
        self.results_repo = results_repo

    def get_results(self, results_id) -> Results:
        return self.results_repo.find_results_by_id(results_id)

    def get_all_results(self) -> list[type[Results]]:
        return self.results_repo.find_all_results()

    def create_results(self):
        return self.results_repo.add_results()