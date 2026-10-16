"""Adjacency-based waiting decisions for physical vehicles."""

import json
from pathlib import Path

from backend.vehicle_control.routes import route


def load_adjacency():
    with Path(__file__).with_name("Tag_adjacency_list.json").open(encoding="utf-8") as stream:
        return json.load(stream)


class TrafficController:
    def __init__(self, state, adjacency):
        self.state = state
        self.adjacency = adjacency

    def handle_scan(self, client, car_id, rfid, chosen_routes):
        # Preserve the existing stop/resume order within an RFID update.
        for other_id in self.state.cars:
            adjacent_tags = self.adjacency.get(rfid, [])
            if self.state.cars[other_id] in adjacent_tags:
                client.publish(f"car/{car_id}/cmd/Start", "False")
                if not any(entry[0] == car_id for entry in self.state.car_stopped):
                    self.state.car_stopped.append([car_id, other_id, self.state.cars[other_id]])
        if self.state.car_stopped:
            to_remove = []
            for entry in self.state.car_stopped:
                if self.state.cars[entry[1]] != entry[2]:
                    if chosen_routes.get(entry[0]) != "inactive" and chosen_routes.get(entry[0]) in route:
                        client.publish(f"car/{entry[0]}/cmd/Start", "True")
                    to_remove.append(entry)
            for entry in to_remove:
                self.state.car_stopped.remove(entry)
