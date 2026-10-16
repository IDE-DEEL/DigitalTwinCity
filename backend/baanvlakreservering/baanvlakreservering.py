"""Compatibility imports; physical vehicle control lives in vehicle_control."""

from backend.vehicle_control import service
from backend.vehicle_control.routes import Direction, route, Depot_exit_route, Depot_route
from backend.vehicle_control.package_service import resume_after_wait

start_mqtt_client = service.start_mqtt_client
stop_mqtt_client = service.stop_mqtt_client
add_car_data_listener = service.add_car_data_listener
getTag = service.get_car_data
drive_command = service.drive_command
load_packages = service.load_packages
reset = service.reset
retrieve_packages_per_house = service.retrieve_packages_per_house


def get_car_route(car_id):
    return service.get_car_route(car_id, service.control.session.chosen_route)


def notify_car_data_listeners():
    service.control.state.notify_listeners()


def on_message(client, userdata, msg):
    service.control.on_message(client, userdata, msg)


def on_connect(client, userdata, flags, reason_code, properties):
    service.control.transport.on_connect(client, userdata, flags, reason_code, properties)


def create_client():
    return service.control.transport.create()


def __getattr__(name):
    if name == "_client":
        return service.control.transport.client
    if name == "state":
        return service.control.session
    if name == "Routes_completed":
        return service.control.state.routes_completed
    if name == "Json_file":
        return service.control.traffic.adjacency
    if hasattr(service.control.state, name):
        return getattr(service.control.state, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


if __name__ == "__main__":
    client = create_client()
    settings = service.control.transport.settings
    if settings is None:
        from backend.core.config import settings
    client.connect(settings.MQTT_HOST, settings.MQTT_PORT)
    print("Waiting for RFID scans...")
    client.loop_forever()
