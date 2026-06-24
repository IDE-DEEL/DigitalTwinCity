import threading
import paho.mqtt.client as mqtt
import ssl
import sys
import json
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "score"))
from backend.score.scoreCalculator import TripData, calculate_score
from backend.score.config import  WEIGHTS, TRIP
from typing import Callable

from backend.core.config import settings
from backend.domain.states import state


# ---------------- MQTT CONFIG ----------------
MQTT_HOST = settings.MQTT_HOST
MQTT_PORT = settings.MQTT_PORT
MQTT_PATH = settings.MQTT_PATH
MQTT_USERNAME = settings.MQTT_USERNAME
MQTT_PASSWORD = settings.MQTT_PASSWORD

# Current topics to subscribe and publish too. This is temporary, as some of it is mainly for a template.
SUB_TOPIC = "car/auto_B/data/LastRFID"
PUB_TOPIC_DIR = "car/auto_B/cmd/Direction"
PUB_TOPIC_MOVE = "car/auto_B/cmd/Start"

# Chosen route from the front end. Currently is a placeholder.
# chosen_route = {
    # "auto_A": "route_1",
    # "auto_B": "route_1",
    # "auto_C": "route_1",
    # "auto_D": "route_1",
    # "auto_E": "route_1"
# }
# The cars last scanned tag. This is for later use so we can check the adjacency.
cars = {
    "auto_A": "",
    "auto_B": "",
    "auto_C": "",
    "auto_D": "",
    "auto_E": ""
}

car_stopped = []

# reading the tag file and making it a variable.
try:
    file_path = Path(__file__).parent / "Tag_adjacency_list.json"
    with open(file_path, "r", encoding="utf-8") as f:
        Json_file = json.load(f)

except FileNotFoundError:
    print("Error: The file 'Tag_adjacency_list.json' was not found.")

except json.JSONDecodeError:
    print("Error: Failed to decode JSON from the file.")

# The specific directions to send to the robot.
Direction = {
    "LEFT": 0,
    "RIGHT": 1,
    "STRAIGHT": 2,
    "ROUNDABOUT": 3,
    "RIGHT_ROUND": 4,
    "HUB_LEFT": 5,
    "HUB_RIGHT":6
}

# This is a list of routes with the commands and tags.
# The tags in the dict below are the tags where the robot has to change direction.
# these will probably be made into JSON files
route = {
    "route_1": [["5A:A5:97:E3:0A:41:89",Direction["LEFT"]], ["5A:95:B3:DE:0A:41:89",Direction["STRAIGHT"]], ["5A:95:B3:DE:0A:41:89", "load", 3], ["5A:25:6B:E0:0A:41:89",Direction["RIGHT"]],
                ["5A:A5:C9:E1:0A:41:89",Direction["STRAIGHT"]], ["5A:B5:6B:DD:0A:41:89",Direction["ROUNDABOUT"]],  ["5A:F5:D5:DB:0A:41:89", Direction["RIGHT_ROUND"]],
                ["5A:65:C3:DA:0A:41:89", Direction["STRAIGHT"]]],
    "route_2": [
            ["04:A2:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:8E:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:89:41:6D:BC:2A:81", Direction["STRAIGHT"]],
            ["04:A1:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["53:3F:78:16:23:00:01", Direction["STRAIGHT"]], ["53:40:78:16:23:00:01", Direction["STRAIGHT"]],
            ["53:45:78:16:23:00:01", Direction["STRAIGHT"]], ["53:3E:78:16:23:00:01", Direction["STRAIGHT"]], ["04:6F:41:6D:BC:2A:81", Direction["LEFT"]], 
            ["04:77:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:75:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:B3:71:6E:BC:2A:81", Direction["STRAIGHT"]], 
            ["53:B3:7A:16:23:00:01", Direction["STRAIGHT"]], ["53:B2:7A:16:23:00:01", Direction["STRAIGHT"]], ["53:B0:7A:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:BB:7A:16:23:00:01", Direction["STRAIGHT"]], ["53:54:75:16:23:00:01", Direction["STRAIGHT"]], ["53:5C:75:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:53:75:16:23:00:01", Direction["STRAIGHT"]], ["04:4A:41:6D:BC:2A:81", Direction["LEFT"]], ["04:19:41:6D:BC:2A:81", Direction["STRAIGHT"]], 
            ["04:D5:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:4D:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["53:67:78:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:58:78:16:23:00:01", Direction["STRAIGHT"]], ["53:57:78:16:23:00:01", Direction["STRAIGHT"]], ["53:66:78:16:23:00:01", Direction["STRAIGHT"]],
            ["53:4E:75:16:23:00:01", Direction["STRAIGHT"]], ["53:4B:75:16:23:00:01", Direction["STRAIGHT"]], ["53:43:75:16:23:00:01", Direction["STRAIGHT"]],
            ["53:9B:73:16:23:00:01", Direction["STRAIGHT"]], ["53:94:73:16:23:00:01", Direction["STRAIGHT"]], ["53:93:73:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:9E:73:16:23:00:01", Direction["STRAIGHT"]], ["53:FE:A5:02:63:00:01", Direction["STRAIGHT"]], ["04:11:3B:6D:BC:2A:81", Direction["STRAIGHT"]], 
            ["04:FF:3A:6D:BC:2A:81", Direction["STRAIGHT"]], ["53:48:96:02:63:00:01", Direction["STRAIGHT"]], ["53:5C:73:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:5E:73:16:23:00:01", Direction["STRAIGHT"]], ["53:53:73:16:23:00:01", Direction["STRAIGHT"]], ["53:5D:73:16:23:00:01", Direction["STRAIGHT"]],
            ["53:4E:78:16:23:00:01", Direction["STRAIGHT"]], ["53:55:78:16:23:00:01", Direction["STRAIGHT"]], ["53:50:78:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:4F:78:16:23:00:01", Direction["STRAIGHT"]], ["53:43:73:16:23:00:01", Direction["LEFT"]], ["53:46:73:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:45:73:16:23:00:01", Direction["STRAIGHT"]], ["53:4C:73:16:23:00:01", Direction["STRAIGHT"]], ["04:7F:41:6D:BC:2A:81", Direction["ROUNDABOUT"]], 
            ["04:AB:41:6D:BC:2A:81", Direction["ROUNDABOUT"]], ["04:4B:FD:68:BC:2A:81", Direction["RIGHT_ROUND"]], ["04:99:41:6D:BC:2A:81", Direction["STRAIGHT"]], 
            ["53:2F:78:16:23:00:01", Direction["STRAIGHT"]], ["53:2E:78:16:23:00:01", Direction["STRAIGHT"]], ["53:26:78:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:25:78:16:23:00:01", Direction["STRAIGHT"]], ["5A:05:B3:DE:0A:41:89", Direction["RIGHT"]], ["5A:E5:37:D9:0A:41:89", Direction["STRAIGHT"]], 
            ["5A:35:6C:DD:0A:41:89", Direction["STRAIGHT"]], ["5A:35:D6:DB:0A:41:89", Direction["STRAIGHT"]], ["53:54:73:16:23:00:01", Direction["STRAIGHT"]],
            ["53:55:73:16:23:00:01", Direction["STRAIGHT"]], ["5A:F5:6B:DD:0A:41:89", Direction["STRAIGHT"]], ["53:64:75:16:23:00:01", Direction["RIGHT"]], 
            ["53:76:73:16:23:00:01", Direction["STRAIGHT"]], ["53:6B:75:16:23:00:01", Direction["STRAIGHT"]], ["04:BC:41:6D:BC:2A:81", Direction["STRAIGHT"]], 
            ["04:B3:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:B9:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:C4:41:6D:BC:2A:81", Direction["STRAIGHT"]], 
            ["53:E4:74:16:23:00:01", Direction["LEFT"]], ["53:7A:7A:16:23:00:01", Direction["STRAIGHT"]], ["53:EC:74:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:ED:74:16:23:00:01", Direction["STRAIGHT"]], ["53:8C:75:16:23:00:01", Direction["STRAIGHT"]], ["53:83:75:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:84:75:16:23:00:01", Direction["STRAIGHT"]], ["53:93:75:16:23:00:01", Direction["STRAIGHT"]], ["53:F6:9C:01:63:00:01", Direction["LEFT"]],
            ["04:16:3B:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:18:3B:6D:BC:2A:81", Direction["STRAIGHT"]], ["53:26:AE:01:63:00:01", Direction["STRAIGHT"]],
            ["53:93:7A:16:23:00:01", Direction["STRAIGHT"]], ["53:88:7A:16:23:00:01", Direction["STRAIGHT"]], ["53:89:7A:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:8A:7A:16:23:00:01", Direction["STRAIGHT"]], ["53:2D:75:16:23:00:01", Direction["STRAIGHT"]], ["53:2E:75:16:23:00:01", Direction["STRAIGHT"]], 
            ["53:23:75:16:23:00:01", Direction["STRAIGHT"]], ["53:24:75:16:23:00:01", Direction["STRAIGHT"]], ["04:D3:41:6D:BC:2A:81", Direction["STRAIGHT"]], 
            ["04:12:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:11:41:6D:BC:2A:81", Direction["STRAIGHT"]], ["04:53:41:6D:BC:2A:81", Direction["STRAIGHT"]]]
}



# Reset route index per car
index = {
    "auto_A": 0,
    "auto_B": 0,
    "auto_C": 0,
    "auto_D": 0,
    "auto_E": 0
}

# Stores the latest vehicle RFID data
car_data = []

# any car that has been stopped and the car it has been stopped by with the tag.
stopped_cars = []

# Registered listeners that should be notified whenever
# new vehicle data is received
car_data_listeners: list[Callable[[list[dict]], None]] = []

# Returns the latest RFID data received from the vehicle.
def getTag():
    return car_data

# Registers a callback function that will be called
# whenever new RFID data is received.
def add_car_data_listener(listener: Callable[[list[dict]], None]):
    if listener not in car_data_listeners:
        car_data_listeners.append(listener)

# Notify all registered listeners with the latest vehicle data.
def notify_car_data_listeners():
    for listener in tuple(car_data_listeners):
        try:
            listener(car_data)
        except Exception as exc:
            print(f"Failed to notify car data listener: {exc}")


# Creating a separate thread to wait for the transfer time before resuming the car's movement
def resume_after_wait(client, car_id, total_time):
    time.sleep((total_time / 1000)+1)
    client.publish(f"car/{car_id}/cmd/Screen", 0)
    client.publish(f"car/{car_id}/cmd/Start", "True")

def load_packages(client, car_id, packages, ms_per_package, package_action):
    if package_action == "load":
        action = 1
    elif package_action == "unload":
        action = 2
    else:
        action = 0
    # Stop the car before loading
    client.publish(f"car/{car_id}/cmd/Start", "False")

    # Calculate total transfer time and publish to the car's MQTT topics
    total_time = packages * ms_per_package
    client.publish(f"car/{car_id}/cmd/TransferTime", total_time)
    client.publish(f"car/{car_id}/cmd/Package", packages)
    client.publish(f"car/{car_id}/cmd/Screen", action)
    threading.Thread(target=resume_after_wait, args=(client, car_id, total_time), daemon=True).start()


# Start
def drive_command(car_id, start_or_stop):
    print("test function, if you see this that means you aren't useless")
    start_mqtt_client()
    _client.publish(f"car/{car_id}/cmd/Start", f"{start_or_stop}")


# ---------------- CALLBACKS ----------------
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("Connected to MQTT")
        topics = [
            "car/auto_A/data/LastRFID",
            "car/auto_B/data/LastRFID",
            "car/auto_C/data/LastRFID",
            "car/auto_D/data/LastRFID",
            "car/auto_E/data/LastRFID",
        ]

        for topic in topics:
            result, mid = client.subscribe(topic)
            print(f"Subscribed to {topic}: result={result}, mid={mid}")
    else:
        print("Connection failed:", reason_code)

# Called whenever a message is received on a subscribed topic.
# Processes RFID scans and sends navigation commands based on the selected route.
def on_message(client, userdata, msg):
    rfid = msg.payload.decode().strip()
    print(f"RFID received: {rfid}")

    # Extract vehicle identifier from MQTT topic
    topic = msg.topic.strip().split("/")

    global index
    global car_data

    # Store latest RFID scan attatched to a car
    cars[topic[1]] = rfid
    # Update vehicle status information
    car_data = [{"auto_id": topic[1], "tag_id": rfid}]


    # Notify listeners about updated RFID information
    notify_car_data_listeners()

    # ----- DECISION LOGIC -----
    if state.start:
        # Ensure vehicle is moving.
        client.publish(f"car/{topic[1]}/cmd/Start", "True")

        # stops the car if there is any other car in the adjacent tags.
        for i in cars:
            adjacent_tags = Json_file.get(rfid, [])

            if cars[i] in adjacent_tags:
                client.publish(f"car/{topic[1]}/cmd/Start", "False")
                if not any(entry[0] == topic[1] for entry in car_stopped):
                    car_stopped.append([topic[1], i, cars[i]])

        # checks if the car that made the other stop, has moved from their tag and starts the stopped car in that case.
        if len(car_stopped) != 0:
            for i in car_stopped:
                if cars[i[1]] != i[2]:
                    client.publish(f"car/{i[0]}/cmd/Start", "True")
                    car_stopped.remove(i)

        # Check whether the scanned RFID matches
        # the current route waypoint
        if rfid == route[state.chosen_route[topic[1]]][index[topic[1]]][0]:

            # Checks if the there are packages and loads or unloads them
            if route[state.chosen_route[topic[1]]][index[topic[1]]][1] == "load" or route[state.chosen_route[topic[1]]][index[topic[1]]][1] == "unload":
                load_packages(client, topic[1], route[state.chosen_route[topic[1]]][index[topic[1]]][2], 500, route[state.chosen_route[topic[1]]][index[topic[1]]][1])

            else:
                # Stop vehicle before changing direction
                client.publish(f"car/{topic[1]}/cmd/Start", "False")
                # Send next direction command
                client.publish(f"car/{topic[1]}/cmd/Direction", route[state.chosen_route[topic[1]]][index[topic[1]]][1])
                # Resume movement
                client.publish(f"car/{topic[1]}/cmd/Start", "True")
                # Advance to next route step
                index[topic[1]] += 1

                # Loop back to start when route completes.
                if len(route[state.chosen_route[topic[1]]]) == index[topic[1]]:
                    index[topic[1]] = 0
                    calculate_score(TRIP, WEIGHTS, topic[1])

    elif not state.start:
        # Emergency stop / manual stop mode
        client.publish(f"car/{topic[1]}/cmd/Start", "False")


# Creates and configures an MQTT client using secure
# WebSocket transport.
def create_client():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, transport="websockets")
    # Configure authentication
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    # Configure WebSocket path
    client.ws_set_options(path=MQTT_PATH)
    # Enable TLS encryption
    client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
    # Register MQTT callbacks
    client.on_connect = on_connect
    client.on_message = on_message
    # Configure automatic reconnection
    client.reconnect_delay_set(min_delay=1, max_delay=60)
    return client

# Singleton MQTT client instance
_client = None


#  Starts the MQTT client in a background thread.
#  Returns the existing client if already running.
def start_mqtt_client():
    global _client
    if _client is not None:
        return _client

    _client = create_client()
    _client.connect(MQTT_HOST, MQTT_PORT)
    print("Waiting for RFID scans...")
    _client.loop_start()
    return _client


# Stops the MQTT client and disconnects from the broker.
def stop_mqtt_client():
    global _client
    if _client is None:
        return

    _client.loop_stop()
    _client.disconnect()
    _client = None


# Standalone execution mode.
# Creates the MQTT client and blocks forever while
# =listening for RFID scans.
if __name__ == "__main__":
    client = create_client()
    client.connect(MQTT_HOST, MQTT_PORT)
    print("Waiting for RFID scans...")
    client.loop_forever()
