import os
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch


class CarLogsApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Allow isolated imports without requiring local secrets or PostgreSQL.
        test_settings = {
            "POSTGRES_USER": "test", "POSTGRES_PASSWORD": "test", "POSTGRES_DB": "test",
            "DATABASE_URL": "sqlite://", "ADMIN_USERNAME": "test", "ADMIN_PASSWORD": "test",
            "SECRET_KEY": "car-logs-test-only", "MQTT_HOST": "test.invalid",
            "MQTT_USERNAME": "test", "MQTT_PASSWORD": "test",
        }
        with patch.dict(os.environ, test_settings):
            from backend.api.v1 import car_logs_api
            from backend.data.db.database import Base, get_db
            from backend.domain.car_commands import CarCommands
            from backend.domain.car_logs import CarLogs
            from backend.domain.track_segment import TrackSegment
            from backend.data.repositories.car_repo import CarRepository
        cls.api = car_logs_api
        cls.Base, cls.get_db = Base, staticmethod(get_db)
        cls.CarCommands, cls.CarLogs, cls.TrackSegment = CarCommands, CarLogs, TrackSegment
        cls.CarRepository = CarRepository

    def setUp(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine, event
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool

        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, record):
            connection.execute("PRAGMA foreign_keys=ON")

        self.Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as db:
            db.add(self.TrackSegment(segment_id="tag-old", status="free"))
            db.add(self.TrackSegment(segment_id="tag-new", status="free"))
            db.commit()
            db.add(self.CarCommands(car_id="auto_A", direction=0,
                                   allowed_to_drive=False, current_segment_id="tag-old"))
            db.commit()
        self.commits = []
        event.listen(self.Session, "after_commit", lambda db: self.commits.append(True))

        def override_db():
            with self.Session() as db:
                yield db

        self.app = FastAPI()
        self.app.include_router(self.api.router, prefix="/api/v1")
        self.app.dependency_overrides[self.get_db] = override_db
        self.client = TestClient(self.app, raise_server_exceptions=False)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.client.close)

    def test_post_records_log_updates_position_and_preserves_response(self):
        response = self.client.post("/api/v1/car-logs",
                                    params={"car_id": "auto_A", "rfid_tag": "tag-new"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "message": "Position logged", "car_id": "auto_A", "segment": "tag-new"})
        with self.Session() as db:
            log = db.query(self.CarLogs).one()
            self.assertEqual((log.car_id, log.rfid_tag), ("auto_A", "tag-new"))
            self.assertIsNotNone(log.created_at)
            self.assertEqual(db.get(self.CarCommands, "auto_A").current_segment_id, "tag-new")
        self.assertEqual(len(self.commits), 2)

    def test_missing_car_preserves_error_and_does_not_write(self):
        response = self.client.post("/api/v1/car-logs",
                                    params={"car_id": "unknown", "rfid_tag": "tag-new"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Car not found"})
        self.assert_no_writes()

    def test_missing_segment_preserves_error_and_does_not_write(self):
        response = self.client.post("/api/v1/car-logs",
                                    params={"car_id": "auto_A", "rfid_tag": "unknown"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Track segment not found"})
        self.assert_no_writes()

    def test_car_check_still_precedes_segment_check(self):
        response = self.client.post("/api/v1/car-logs",
                                    params={"car_id": "unknown", "rfid_tag": "unknown"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Car not found"})
        self.assert_no_writes()

    def test_json_body_does_not_replace_existing_query_parameters(self):
        response = self.client.post("/api/v1/car-logs",
                                    json={"car_id": "auto_A", "rfid_tag": "tag-new"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual({tuple(error["loc"]) for error in response.json()["detail"]},
                         {("query", "car_id"), ("query", "rfid_tag")})
        self.assert_no_writes()

    def test_get_preserves_fields_filters_and_newest_first_order(self):
        now = datetime.now(timezone.utc)
        with self.Session() as db:
            db.add_all([
                self.CarLogs(car_id="auto_A", rfid_tag="tag-old", created_at=now),
                self.CarLogs(car_id="auto_A", rfid_tag="tag-new", created_at=now + timedelta(seconds=1)),
                self.CarLogs(car_id="other", rfid_tag="tag-old", created_at=now),
            ])
            db.commit()
        response = self.client.get("/api/v1/car-logs/auto_A")
        self.assertEqual(response.status_code, 200)
        logs = response.json()
        self.assertEqual([log["rfid_tag"] for log in logs], ["tag-new", "tag-old"])
        for log in logs:
            self.assertEqual(set(log), {"id", "car_id", "rfid_tag", "created_at"})
            self.assertEqual(log["car_id"], "auto_A")

    def test_no_logs_preserves_error_for_existing_and_unknown_car(self):
        for car_id in ("auto_A", "unknown"):
            with self.subTest(car_id=car_id):
                response = self.client.get(f"/api/v1/car-logs/{car_id}")
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json(), {"detail": "No logs found for this car"})

    def test_second_write_failure_preserves_existing_partial_commit(self):
        with patch.object(self.CarRepository, "update", side_effect=RuntimeError("write failed")):
            response = self.client.post("/api/v1/car-logs",
                                        params={"car_id": "auto_A", "rfid_tag": "tag-new"})
        self.assertEqual(response.status_code, 500)
        with self.Session() as db:
            self.assertEqual(db.query(self.CarLogs).count(), 1)
            self.assertEqual(db.get(self.CarCommands, "auto_A").current_segment_id, "tag-old")
        self.assertEqual(len(self.commits), 1)

    def assert_no_writes(self):
        self.assertEqual(self.commits, [])
        with self.Session() as db:
            self.assertEqual(db.query(self.CarLogs).count(), 0)
            self.assertEqual(db.get(self.CarCommands, "auto_A").current_segment_id, "tag-old")


if __name__ == "__main__":
    unittest.main()
