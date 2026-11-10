"""Tests for per-vehicle heartbeat connection tracking."""

from backend.vehicle_control.connection_status import ConnectionStatus, VehicleConnectionTracker


def test_waiting_until_first_heartbeat():
    tracker = VehicleConnectionTracker(clock=lambda: 100.0)
    assert set(tracker.snapshot().values()) == {"waiting"}


def test_heartbeat_timeout_and_reconnection():
    now = [100.0]
    tracker = VehicleConnectionTracker(timeout_seconds=15, clock=lambda: now[0])
    tracker.heartbeat("auto_A")
    assert tracker.snapshot()["auto_A"] == "connected"
    now[0] += 15
    assert tracker.snapshot()["auto_A"] == "disconnected"
    tracker.heartbeat("auto_A")
    assert tracker.snapshot()["auto_A"] == "connected"


def test_vehicle_statuses_are_independent():
    now = [0.0]
    tracker = VehicleConnectionTracker(timeout_seconds=15, clock=lambda: now[0])
    tracker.heartbeat("auto_A")
    now[0] = 10.0
    tracker.heartbeat("auto_B")
    now[0] = 16.0
    assert tracker.snapshot()["auto_A"] == "disconnected"
    assert tracker.snapshot()["auto_B"] == "connected"
    assert tracker.snapshot()["auto_C"] == "waiting"


def test_explicit_disconnect():
    tracker = VehicleConnectionTracker(clock=lambda: 0.0)
    assert tracker.disconnected("auto_A") == ConnectionStatus.WAITING
    tracker.heartbeat("auto_A")
    assert tracker.disconnected("auto_A") == ConnectionStatus.DISCONNECTED
