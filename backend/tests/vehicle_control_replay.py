"""Offline RFID scenarios; expected traces were recorded before refactoring."""

import hashlib
import json
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch

from backend.vehicle_control.package_service import resume_after_wait
from backend.vehicle_control.routes import get_car_route, route
from backend.vehicle_control.service import VehicleControlService
from backend.vehicle_control.state import CAR_IDS


class RecordingClient:
    def __init__(self):
        self.commands = []

    def publish(self, topic, payload):
        self.commands.append([topic, payload])


class CurrentAdapter:
    def __init__(self):
        self.client = RecordingClient()
        self.pending = []
        self.waits = []
        self.scores = []
        session = SimpleNamespace(start=False, chosen_route=dict.fromkeys(CAR_IDS, "route_1"))
        transport = SimpleNamespace(client=self.client, start=lambda: self.client)
        self.service = VehicleControlService(session=session, transport=transport,
                                            schedule=self.schedule, score=self.score)
        self.state = self.service.state
        self.session = session
        self.adjacency = self.service.traffic.adjacency
        self.route_names = list(route)

    def schedule(self, client, car_id, total_time):
        self.pending.append((client, car_id, total_time))

    def score(self, trip, weights, car_id, route_length):
        self.scores.append([car_id, route_length])

    def run_pending(self):
        pending, self.pending = self.pending, []
        with patch('backend.vehicle_control.package_service.time.sleep', self.waits.append):
            for args in pending:
                resume_after_wait(*args)

    def scan(self, car_id, tag):
        msg = SimpleNamespace(topic=f"car/{car_id}/data/LastRFID", payload=tag.encode())
        self.service.on_message(self.client, None, msg)

    def load(self, car_id, count, action="load"):
        self.service.packages.load_packages(car_id, count, 1500, action)

    def drive(self, car_id, value):
        self.service.drive_command(car_id, value)

    def reset(self):
        self.service.reset()

    def add_listener(self, listener):
        self.state.add_listener(listener)

    def route(self, car_id):
        return get_car_route(car_id, self.session.chosen_route)

    def snapshot(self):
        return {key: deepcopy(getattr(self.state, key)) for key in (
            "cars", "packets", "max_packets", "completed_houses", "houses_requested",
            "houses_receaved", "car_stopped", "index", "routes_completed", "car_data")}


def replay(adapter_type, scenario):
    a = adapter_type()
    snapshots = []
    events = []
    errors = []
    listener = lambda data: events.append(deepcopy(data))
    a.add_listener(listener)
    a.add_listener(listener)

    def record():
        snapshots.append(a.snapshot())

    def scan(car_id, tag):
        try:
            a.scan(car_id, tag)
        except Exception as exc:
            errors.append([type(exc).__name__, str(exc)])
        record()

    record()
    if scenario == "stopped_and_inactive":
        scan("auto_A", "unknown-tag")
        a.session.start = True
        for chosen in ("inactive", "missing-route"):
            a.session.chosen_route["auto_A"] = chosen
            a.drive("auto_A", True)
            a.drive("auto_A", "True")
            a.drive("auto_A", False)
            scan("auto_A", "unknown-tag")
        a.session.chosen_route["auto_A"] = "route_1"
        a.drive("auto_A", True)
        a.drive("auto_A", "False")
        scan("auto_A", a.route("auto_A")[1][0])
    elif scenario == "load_unload_and_reset":
        a.state.max_packets["auto_A"] = 5
        a.load("auto_A", 5)
        record()
        a.load("auto_A", 2, "unload")
        a.load("auto_B", 4, "unload")
        a.load("auto_C", 1, "unknown-action")
        record()
        a.session.start = False
        a.run_pending()
        a.reset()
        record()
        a.load("auto_A", 1)
        a.run_pending()
        a.reset()
    elif scenario == "delivery":
        a.session.start = True
        tags = list(a.state.houses_requested)
        a.load("auto_A", 5)
        scan("auto_A", tags[1])
        scan("auto_A", tags[1])
        scan("auto_A", tags[2])
        a.load("auto_B", 5)
        scan("auto_B", tags[2])
        scan("auto_B", tags[2])
        a.run_pending()
    elif scenario == "traffic":
        a.session.start = True
        # A real adjacency pair from the original track definition.
        adjacency = a.adjacency
        tag, neighbors = next((tag, tags) for tag, tags in adjacency.items() if tags)
        scan("auto_B", neighbors[0])
        scan("auto_A", tag)
        scan("auto_A", tag)
        scan("auto_B", "away-from-conflict")
        a.session.chosen_route["auto_A"] = "inactive"
        scan("auto_B", neighbors[0])
        a.session.chosen_route["auto_A"] = "route_1"
        scan("auto_A", tag)
        a.session.chosen_route["auto_A"] = "inactive"
        scan("auto_B", "away-again")
    elif scenario == "all_routes_and_depots":
        a.session.start = True
        # Traverse every configured route for every car, including depot legs.
        for route_name in a.route_names:
            for car_id in CAR_IDS:
                a.session.chosen_route[car_id] = route_name
                a.state.index[car_id] = 1
                a.state.max_packets[car_id] = 2
                a.state.completed_houses[car_id] = a.route(car_id)[0]
                for tag, direction in a.route(car_id)[1:]:
                    scan(car_id, tag)
                a.run_pending()
        a.reset()
    elif scenario == "malformed_and_listeners":
        def broken_listener(data):
            raise RuntimeError("listener failed")
        a.add_listener(broken_listener)
        scan("auto_A", "  trimmed-tag  ")
        a.session.start = True
        scan("unregistered-car", "unknown")
        a.state.index["auto_A"] = 100000
        scan("auto_A", "unknown")
    else:
        raise ValueError(scenario)
    record()
    result = {
        "commands": a.client.commands, "snapshots": snapshots, "events": events,
        "pending": [[args[1], args[2]] for args in a.pending],
        "waits": a.waits, "scores": a.scores, "errors": errors,
    }
    encoded = json.dumps(result, sort_keys=True, separators=(",", ":")).encode()
    return {"sha256": hashlib.sha256(encoded).hexdigest(),
            "commands": len(a.client.commands), "snapshots": len(snapshots),
            "events": len(events), "scores": len(a.scores), "errors": errors}


SCENARIOS = ("stopped_and_inactive", "load_unload_and_reset", "delivery",
             "traffic", "all_routes_and_depots", "malformed_and_listeners")
