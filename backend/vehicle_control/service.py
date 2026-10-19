"""Coordinate physical vehicle updates and expose the API entry points."""

from backend.domain.states import state as session_state
from backend.score.scoreCalculator import calculate_score
from backend.score.config import WEIGHTS, TRIP
from backend.vehicle_control.mqtt_client import MQTTClient
from backend.vehicle_control.package_service import PackageService, schedule_resume
from backend.vehicle_control.routes import get_car_route, route
from backend.vehicle_control.state import VehicleState
from backend.vehicle_control.traffic_control import TrafficController, load_adjacency


class VehicleControlService:
    def __init__(self, state=None, session=None, transport=None, adjacency=None,
                 schedule=schedule_resume, score=calculate_score):
        self.state = state if state is not None else VehicleState()
        self.session = session if session is not None else session_state
        self.transport = transport if transport is not None else MQTTClient(self.on_message)
        self.packages = PackageService(self.state, self.transport.start, schedule)
        self.traffic = TrafficController(
            self.state, adjacency if adjacency is not None else load_adjacency())
        self.score = score

    def drive_command(self, car_id, start_or_stop):
        client = self.transport.start()
        chosen = self.session.chosen_route.get(car_id)
        inactive = chosen == "inactive" or chosen not in route
        if start_or_stop in [True, "True"] and inactive:
            client.publish(f"car/{car_id}/cmd/Start", "False")
        else:
            client.publish(f"car/{car_id}/cmd/Start", f"{start_or_stop}")

    def on_message(self, client, userdata, msg):
        rfid = msg.payload.decode().strip()
        topic = msg.topic.strip().split("/")
        car_id = topic[1]
        self.state.record_scan(car_id, rfid)
        if self.session.start:
            chosen = self.session.chosen_route[car_id]
            inactive = chosen == "inactive" or chosen not in route
            if inactive:
                client.publish(f"car/{car_id}/cmd/Start", "False")
                return
            client.publish(f"car/{car_id}/cmd/Start", "True")
            self.packages.deliver_at(car_id, rfid)
            self.traffic.handle_scan(client, car_id, rfid, self.session.chosen_route)
            car_route = get_car_route(car_id, self.session.chosen_route)
            if car_route and rfid == car_route[self.state.index[car_id]][0]:
                client.publish(f"car/{car_id}/cmd/Start", "False")
                client.publish(f"car/{car_id}/cmd/Direction", car_route[self.state.index[car_id]][1])
                client.publish(f"car/{car_id}/cmd/Start", "True")
                self.state.index[car_id] += 1
                if len(car_route) == self.state.index[car_id]:
                    self.state.index[car_id] = 1
                    self.state.routes_completed[car_id] += 1
                    needed = self.state.max_packets[car_id] - self.state.packets[car_id]
                    if needed > 0:
                        self.packages.load_packages(car_id, needed, 1500, "load")
                    if self.state.completed_houses[car_id] == car_route[0]:
                        self.score(TRIP, WEIGHTS, car_id,
                                   (len(car_route) - 1) * self.state.routes_completed[car_id])
                        self.state.routes_completed[car_id] = 0
                        client.publish(f"car/{car_id}/cmd/Start", "False")
        elif not self.session.start:
            client.publish(f"car/{car_id}/cmd/Start", "False")

    def reset(self):
        self.state.reset(self.transport.client)

    def set_capacity(self, car_id, capacity):
        self.state.max_packets[car_id] = capacity


# The application shares one control service across its WebSocket connections.
control = VehicleControlService()


def start_mqtt_client():
    return control.transport.start()


def stop_mqtt_client():
    control.transport.stop()


def add_car_data_listener(listener):
    control.state.add_listener(listener)


def get_car_data():
    return control.state.car_data


def drive_command(car_id, start_or_stop):
    control.drive_command(car_id, start_or_stop)


def load_packages(car_id, packages, ms_per_package, package_action):
    control.packages.load_packages(car_id, packages, ms_per_package, package_action)


def set_capacity(car_id, capacity):
    control.set_capacity(car_id, capacity)


def reset():
    control.reset()


def retrieve_packages_per_house():
    return control.packages.retrieve_packages_per_house()
