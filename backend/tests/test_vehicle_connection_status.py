
"""Validate battery-based connection status without a real MQTT broker."""

from types import SimpleNamespace
from unittest.mock import MagicMock

from backend.vehicle_control.service import VehicleControlService


def test_battery_does_not_trigger_rfid_or_drive_commands():
    state = MagicMock()
    transport = MagicMock()
    control = VehicleControlService(state=state, transport=transport, adjacency={})
    client = MagicMock()

    control.on_message(
        client,
        None,
        SimpleNamespace(topic="car/auto_A/data/battery", payload=b"100"),
    )

    assert control.connections.snapshot()["auto_A"] == "connected"
    assert control.connections.snapshot()["auto_B"] == "waiting"
    state.record_scan.assert_not_called()
    client.publish.assert_not_called()


def test_unknown_or_malformed_battery_is_ignored():
    state = MagicMock()
    control = VehicleControlService(
        state=state,
        transport=MagicMock(),
        adjacency={},
    )

    control.on_message(
        None,
        None,
        SimpleNamespace(topic="car/auto_X/data/battery", payload=b"75"),
    )

    control.on_message(
        None,
        None,
        SimpleNamespace(topic="car/auto_A/data/battery", payload=b"invalid"),
    )

    assert control.connections.snapshot()["auto_A"] == "waiting"
    state.record_scan.assert_not_called()
