import paho.mqtt.client as mqtt
import ssl
import time

# start = [
#     [[0],[1],[2],[0]],
#     [[0],[3],[4],[0]],
#     [[0],[5],[6],[0]],
#     [[0],[7],[8],[0]]
# ]
#
# crossroad_roundabout = [
#     [[0],[1],[2],[0]],
#     [[3],[4],[5],[6]],
#     [[7],[8],[9],[10]],
#     [[0],[11],[12],[0]]
# ]
#
# t_junction_up = [
#     [[0],[7],[8],[0]],
#     [[4],[5],[5],[6]],
#     [[1],[2],[2],[3]],
#     [[0],[0],[0],[0]]
# ]
#
# t_junction_right = [
#     [[0],[1],[4],[0]],
#     [[0],[2],[5],[7]],
#     [[0],[2],[5],[8]],
#     [[0],[3],[6],[0]]
# ]
#
# t_junction_down = [
#     [[0],[0],[0],[0]],
#     [[3],[2],[5],[1]],
#     [[6],[5],[5],[4]],
#     [[0],[8],[7],[0]]
# ]
#
# t_junction_left = [
#     [[0],[6],[3],[0]],
#     [[8],[5],[2],[0]],
#     [[7],[5],[2],[0]],
#     [[0],[4],[1],[0]]
# ]
#
# straight_horizontal = [
#     [[0],[0],[0],[0]],
#     [[1],[2],[2],[3]],
#     [[4],[5],[5],[6]],
#     [[0],[0],[0],[0]]
# ]
#
# straight_vertical = [
#     [[0],[4],[1],[0]],
#     [[0],[5],[2],[0]],
#     [[0],[5],[2],[0]],
#     [[0],[6],[3],[0]]
# ]
#
# turn_NE = [
#     [[0],[3],[6],[0]],
#     [[0],[0],[5],[4]],
#     [[0],[2],[0],[1]],
#     [[0],[0],[0],[0]]
# ]
#
# turn_ES = [
#     [[0],[0],[0],[0]],
#     [[0],[2],[0],[3]],
#     [[0],[0],[5],[6]],
#     [[0],[1],[4],[0]]
# ]
#
# turn_SW = [
#     [[0],[0],[0],[0]],
#     [[1],[0],[2],[0]],
#     [[4],[5],[0],[0]],
#     [[0],[6],[3],[0]]
# ]
#
# turn_WN = [
#     [[0],[4],[1],[0]],
#     [[6],[5],[0],[0]],
#     [[3],[0],[2],[0]],
#     [[0],[0],[0],[0]]
# ]
#
#
# '''
# bereken alle commandos van te voren gebaseerd op wat de route is vanuit de front end, dan een lijst vullen met de commandos en per rfid tag het volgende commando doorsturen.
# voor het genereren van de commandos of gewoon een variabele string die je elke keer weer in de lijst append of aan een variable +=
# '''
# # all zeros are for empty space to create a kind of x and y coordinates
# # matrix has 4 rows and 5 columns.
# # each
# matrix = [
#     [[turn_ES],            [t_junction_down],       [straight_horizontal],   [straight_horizontal],  [turn_SW]],
#     [[t_junction_right],   [crossroad_roundabout],  [turn_SW],               [turn_ES],              [t_junction_left]],
#     [[straight_vertical],  [turn_NE],               [crossroad_roundabout],  [t_junction_left],      [straight_vertical]],
#     [[turn_NE],            [straight_horizontal],   [t_junction_up],         [t_junction_up],        [turn_WN]]
# ]

# ---------------- MQTT CONFIG ----------------
MQTT_HOST = "digitaltwin.duckdns.org"
MQTT_PORT = 443
MQTT_PATH = "/mqtt"

MQTT_USERNAME = "backend_user"
MQTT_PASSWORD = "NBQ4Tnz@EtN3rDu$eBdS"

SUB_TOPIC = "car/auto_B/data/LastRFID"
PUB_TOPIC_DIR = "car/auto_X/cmd/direction"
PUB_TOPIC_MOVE = "car/auto_B/cmd/Start"

auto_1 = "auto_1"
auto_2 = "auto_2"

# this is a list of routes with the commands and tags

route_1 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_2 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_3 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_4 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_5 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_6 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_7 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_8 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_9 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_10 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_11 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_12 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]
route_13 = [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]]

route = {
    "route_1": [["left"], ["forward"], ["right"], ["right"], ["forward"], ["right"], ["right"], ["forward"]],
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
def getTag():
    return car_data

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
    global car_data
    car_data = [
        {"auto_id": "Auto B", "tag_id": rfid},
    ]
    # ----- DECISION LOGIC -----
    if start == True:
        client.publish(PUB_TOPIC_MOVE, "True")
        print("Car started...")
    elif start == False:
        client.publish(PUB_TOPIC_MOVE, "False")
        print("Car stopped...")
    # elif start == True == False:
    #     response = ""
    #     history_start = True
    # elif start == True and history_start == False:
    #     response = ""

    # # publish response
    # client.publish(PUB_TOPIC_DIR, response)
    # print("Sent:", response)

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

