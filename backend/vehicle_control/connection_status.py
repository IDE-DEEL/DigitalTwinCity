"""Track vehicle heartbeats and notify listeners when connection status changes."""

import os
import threading
import time
from enum import StrEnum
from typing import Callable

from backend.vehicle_control.state import CAR_IDS


class ConnectionStatus(StrEnum):
    WAITING = "waiting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"


def configured_timeout() -> float:
    value = float(os.getenv("VEHICLE_CONNECTION_TIMEOUT_SECONDS", "150"))
    if value <= 0:
        raise ValueError("VEHICLE_HEARTBEAT_TIMEOUT_SECONDS must be positive")
    return value


class VehicleConnectionTracker:
    def __init__(self, timeout_seconds=None, clock: Callable[[], float] = time.monotonic):
        self.timeout_seconds = configured_timeout() if timeout_seconds is None else timeout_seconds
        if self.timeout_seconds <= 0:
            raise ValueError("Heartbeat timeout must be positive")
        self.clock = clock
        self._lock = threading.RLock()
        self._last_seen = {car_id: None for car_id in CAR_IDS}
        self._statuses = {car_id: ConnectionStatus.WAITING for car_id in CAR_IDS}
        self._listeners = []

    def add_listener(self, listener):
        with self._lock:
            if listener not in self._listeners:
                self._listeners.append(listener)

    def _validate(self, car_id):
        if car_id not in self._statuses:
            raise ValueError(f"Unknown vehicle: {car_id}")

    def _change_status(self, car_id, status):
        if self._statuses[car_id] == status:
            return None
        self._statuses[car_id] = status
        return tuple(self._listeners)

    @staticmethod
    def _notify(listeners, car_id, status):
        if listeners:
            for listener in listeners:
                try:
                    listener({"car_id": car_id, "status": status.value})
                except Exception:
                    # A failing WebSocket listener must not interrupt MQTT processing.
                    import logging
                    logging.getLogger(__name__).exception("Connection status listener failed")

    def heartbeat(self, car_id):
        self._validate(car_id)
        with self._lock:
            self._last_seen[car_id] = self.clock()
            listeners = self._change_status(car_id, ConnectionStatus.CONNECTED)
        self._notify(listeners, car_id, ConnectionStatus.CONNECTED)
        return ConnectionStatus.CONNECTED

    def disconnected(self, car_id):
        self._validate(car_id)
        with self._lock:
            if self._last_seen[car_id] is None:
                return ConnectionStatus.WAITING
            listeners = self._change_status(car_id, ConnectionStatus.DISCONNECTED)
        self._notify(listeners, car_id, ConnectionStatus.DISCONNECTED)
        return ConnectionStatus.DISCONNECTED

    def refresh(self):
        now = self.clock()
        changes = []
        with self._lock:
            for car_id, last_seen in self._last_seen.items():
                if last_seen is not None and now - last_seen >= self.timeout_seconds:
                    listeners = self._change_status(car_id, ConnectionStatus.DISCONNECTED)
                    if listeners:
                        changes.append((listeners, car_id))
            statuses = dict(self._statuses)
        for listeners, car_id in changes:
            self._notify(listeners, car_id, ConnectionStatus.DISCONNECTED)
        return statuses

    def check_timeouts(self):
        return self.refresh()

    def snapshot(self):
        return {car_id: status.value for car_id, status in self.refresh().items()}
