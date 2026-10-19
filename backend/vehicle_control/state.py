"""Mutable state shared by the physical vehicle control components."""

import logging
from dataclasses import dataclass, field

from backend.core.error_logging import log_unexpected_error

logger = logging.getLogger(__name__)

CAR_IDS = ("auto_A", "auto_B", "auto_C", "auto_D", "auto_E")
INITIAL_TAGS = dict(zip(CAR_IDS, (
    "53:29:7A:16:23:00:01", "53:2A:7A:16:23:00:01",
    "53:2B:7A:16:23:00:01", "53:20:7A:16:23:00:01",
    "53:33:7A:16:23:00:01",
)))
HOUSE_REQUESTS = {'53:46:78:16:23:00:01': 1,
 '53:C8:7A:16:23:00:01': 3,
 '53:4D:75:16:23:00:01': 5,
 '53:0D:75:16:23:00:01': 3,
 '53:14:75:16:23:00:01': 3,
 '53:8E:73:16:23:00:01': 1,
 '53:5E:75:16:23:00:01': 3,
 '53:2E:78:16:23:00:01': 2,
 '53:76:78:16:23:00:01': 4,
 '53:C2:7A:16:23:00:01': 1,
 '53:D4:74:16:23:00:01': 2,
 '04:B2:41:6D:BC:2A:81': 1,
 '53:66:75:16:23:00:01': 2,
 '53:73:75:16:23:00:01': 1,
 '53:92:7A:16:23:00:01': 1}


def per_car(value):
    return dict.fromkeys(CAR_IDS, value)


@dataclass
class VehicleState:
    cars: dict = field(default_factory=lambda: per_car(""))
    packets: dict = field(default_factory=lambda: per_car(0))
    max_packets: dict = field(default_factory=lambda: per_car(0))
    completed_houses: dict = field(default_factory=lambda: per_car(0))
    houses_requested: dict = field(default_factory=lambda: HOUSE_REQUESTS.copy())
    houses_receaved: dict = field(default_factory=lambda: dict.fromkeys(HOUSE_REQUESTS, 0))
    car_stopped: list = field(default_factory=list)
    index: dict = field(default_factory=lambda: per_car(1))
    routes_completed: dict = field(default_factory=lambda: per_car(0))
    car_data: list = field(default_factory=list)
    car_data_listeners: list = field(default_factory=list)

    def record_scan(self, car_id, rfid):
        self.cars[car_id] = rfid
        for car in self.car_data:
            if car["auto_id"] == car_id:
                car["tag_id"] = rfid
                break
        else:
            self.car_data.append({"auto_id": car_id, "tag_id": rfid})
        self.notify_listeners()

    def add_listener(self, listener):
        if listener not in self.car_data_listeners:
            self.car_data_listeners.append(listener)

    def notify_listeners(self):
        for listener in tuple(self.car_data_listeners):
            try:
                listener(self.car_data)
            except Exception as exc:
                log_unexpected_error(logger, "Vehicle data listener failed", exc)

    def reset(self, client):
        # Keep the existing reset commands and state transitions.
        if client is not None:
            for car_id in self.packets:
                if self.packets[car_id] > 0:
                    client.publish(f"car/{car_id}/cmd/Package", self.packets[car_id])
                    client.publish(f"car/{car_id}/cmd/Screen", 2)
                else:
                    client.publish(f"car/{car_id}/cmd/Package", 0)
                    client.publish(f"car/{car_id}/cmd/Screen", 0)
        self.packets = per_car(0)
        self.index = per_car(1)
        self.cars.update(INITIAL_TAGS)
        for key in self.houses_receaved:
            self.houses_receaved[key] = 0
        for key in self.completed_houses:
            self.completed_houses[key] = 0
        for key in self.max_packets:
            self.max_packets[key] = 0
        self.car_data.clear()
        self.car_data.extend({"auto_id": car_id, "tag_id": tag}
                             for car_id, tag in self.cars.items())
        self.notify_listeners()
