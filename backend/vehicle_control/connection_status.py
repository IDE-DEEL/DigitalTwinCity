"""Track the connection status of each physical vehicle independently."""

import os
import time
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Callable

from backend.vehicle_control.state import CAR_IDS


class ConnectionStatus(StrEnum):
    WAITING = "waiting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"


def configured_timeout() -> float:
    """Read the timeout from the environment without hardcoding it in the tracker."""
    value = float(os.getenv("VEHICLE_HEARTBEAT_TIMEOUT_SECONDS", "15"))
    if value <= 0:
        raise ValueError("VEHICLE_HEARTBEAT_TIMEOUT_SECONDS must be positive")
    return value


@dataclass
class VehicleConnectionTracker:
    timeout_seconds: float = field(default_factory=configured_timeout)
    clock: Callable[[], float] = time.monotonic
    last_seen: dict[str, float | None] = field(
        default_factory=lambda: {car_id: None for car_id in CAR_IDS}
    )
    statuses: dict[str, ConnectionStatus] = field(
        default_factory=lambda: {car_id: ConnectionStatus.WAITING for car_id in CAR_IDS}
    )

    def __post_init__(self):
        if self.timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")

    def _validate(self, car_id: str) -> None:
        if car_id not in self.statuses:
            raise ValueError(f"Unknown vehicle: {car_id}")

    def heartbeat(self, car_id: str) -> ConnectionStatus:
        """Mark a vehicle as connected after receiving a valid heartbeat."""
        self._validate(car_id)
        self.last_seen[car_id] = self.clock()
        self.statuses[car_id] = ConnectionStatus.CONNECTED
        return self.statuses[car_id]

    def disconnected(self, car_id: str) -> ConnectionStatus:
        """Process an explicit offline notification without waiting for timeout."""
        self._validate(car_id)
        if self.last_seen[car_id] is not None:
            self.statuses[car_id] = ConnectionStatus.DISCONNECTED
        return self.statuses[car_id]

    def refresh(self) -> dict[str, ConnectionStatus]:
        """Expire vehicles independently using monotonic elapsed time."""
        now = self.clock()
        for car_id, last_seen in self.last_seen.items():
            if (last_seen is not None and
                now - last_seen >= self.timeout_seconds):
                self.statuses[car_id] = ConnectionStatus.DISCONNECTED
        return self.statuses.copy()

    def snapshot(self) -> dict[str, str]:
        return {car_id: status.value for car_id, status in self.refresh().items()}
