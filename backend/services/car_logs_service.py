from datetime import datetime, timezone

from backend.data.repositories.car_logs_repo import CarLogsRepository
from backend.data.repositories.car_repo import CarRepository
from backend.data.repositories.track_segment_repo import TrackSegmentRepository
from backend.domain.car_logs import CarLogs


class CarNotFoundError(Exception):
    pass


class TrackSegmentNotFoundError(Exception):
    pass


class CarLogsNotFoundError(Exception):
    pass


class CarLogsService:
    def __init__(self, car_repo: CarRepository, logs_repo: CarLogsRepository,
                 segment_repo: TrackSegmentRepository):
        self.car_repo = car_repo
        self.logs_repo = logs_repo
        self.segment_repo = segment_repo

    def log_rfid_tag(self, car_id: str, rfid_tag: str) -> None:
        car = self.car_repo.find_by_id(car_id)
        if not car:
            raise CarNotFoundError()
        if not self.segment_repo.find_by_id(rfid_tag):
            raise TrackSegmentNotFoundError()

        log = CarLogs(car_id=car_id, rfid_tag=rfid_tag,
                      created_at=datetime.now(timezone.utc))
        # Preserve the existing repository writes and their commit order.
        self.logs_repo.add(log)
        car.current_segment_id = rfid_tag
        self.car_repo.update(car)

    def get_car_logs(self, car_id: str) -> list[CarLogs]:
        logs = self.logs_repo.find_by_car_id(car_id)
        if not logs:
            raise CarLogsNotFoundError()
        return logs
