import paho.mqtt.client as mqtt
import ssl
import time
from typing import Callable

from backend.core.config import settings


# ---------------- MQTT CONFIG ----------------
MQTT_HOST = settings.MQTT_HOST
MQTT_PORT = settings.MQTT_PORT
MQTT_PATH = settings.MQTT_PATH
MQTT_USERNAME = settings.MQTT_USERNAME
MQTT_PASSWORD = settings.MQTT_PASSWORD

SUB_TOPIC = "car/auto_B/data/LastRFID"
PUB_TOPIC_DIR = "car/auto_B/cmd/direction"
PUB_TOPIC_MOVE = "car/auto_B/cmd/Start"

chosen_route = "route_1"

# this is a list of routes with the commands and tags

# these will probably be made into JSON files
route = {
    "route_1": [["9A:95:B3:DE:0A:41:89","left"], ["5A:55:C3:DA:0A:41:89","right"]],
    "route_2": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_3": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_4": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_5": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_6": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_7": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_8": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_9": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_10": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_11": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_12": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
    "route_13": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],

}

Tags = {
    "tag 1": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 2": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 3": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 4": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 5": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 6": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 7": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 8": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 9": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 10": ["adjacent tag", "adjacent tag", "adjacent tag"],
    "tag 11": ["adjacent tag", "adjacent tag", "adjacent tag"]

}
car_data = []
car_data_listeners: list[Callable[[list[dict]], None]] = []


def getTag():
    return car_data


def add_car_data_listener(listener: Callable[[list[dict]], None]):
    if listener not in car_data_listeners:
        car_data_listeners.append(listener)


def notify_car_data_listeners():
    for listener in tuple(car_data_listeners):
        try:
            listener(car_data)
        except Exception as exc:
            print(f"Failed to notify car data listener: {exc}")


start = True
# ---------------- CALLBACKS ----------------
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("✅ Connected to MQTT")
        client.subscribe(SUB_TOPIC)
    else:
        print("❌ Connection failed:", reason_code)

def on_message(client, userdata, msg):
    rfid = msg.payload.decode().strip()
    print(f"RFID received: {rfid}")

    global auto_B
    global car_data
    global index

    auto_B = rfid
    car_data = [{"auto_id": "Auto B", "tag_id": rfid}]
    index = 0

    notify_car_data_listeners()
    # ----- DECISION LOGIC -----
    if start == True:
        client.publish(PUB_TOPIC_MOVE, "True")
        if rfid == route[chosen_route][index][0]:
            client.publish(PUB_TOPIC_MOVE, "False")
            client.publish(PUB_TOPIC_DIR, route[chosen_route][index][1])
            client.publish(PUB_TOPIC_MOVE, "True")
            index += 1
            if len(route[chosen_route]) == index:
                index = 0
    elif start == False:
        client.publish(PUB_TOPIC_MOVE, "False")



# index for the loop
# index = 0
#
#     # check to make sure that cars arent on the same track position.
#     if auto_1 == auto_2 or auto_2 == auto_1:
#         # send stop to car
#         time.sleep(1)  # for specific car
#
#     # check to see if the car is at the destination tag and sends new command.
#     if auto_1 == route_1[index][1] or auto_2 == route_1[index][1]:
#         if Tags[auto_1][1] == auto_2 or Tags[auto_1][2] == auto_2:
#             time.sleep(1)
#         client.publish(TOPIC, route_1[index][0])
#         print("Sent:", route_1[index][0])
#         index += 1


def create_client():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, transport="websockets")
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.ws_set_options(path=MQTT_PATH)
    client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
    client.on_connect = on_connect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=60)
    return client


_client = None


def start_mqtt_client():
    global _client
    if _client is not None:
        return _client

    _client = create_client()
    _client.connect(MQTT_HOST, MQTT_PORT)
    print("Waiting for RFID scans...")
    _client.loop_start()
    return _client


def stop_mqtt_client():
    global _client
    if _client is None:
        return

    _client.loop_stop()
    _client.disconnect()
    _client = None


if __name__ == "__main__":
    client = create_client()
    client.connect(MQTT_HOST, MQTT_PORT)
    print("Waiting for RFID scans...")
    client.loop_forever()

