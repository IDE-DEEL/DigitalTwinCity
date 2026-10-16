"""MQTT connection lifecycle for physical vehicle control."""

import ssl

import paho.mqtt.client as mqtt

from backend.vehicle_control.state import CAR_IDS


class MQTTClient:
    def __init__(self, on_message, settings=None):
        self.client = None
        self.on_message = on_message
        self.settings = settings

    def create(self):
        settings = self.settings
        if settings is None:
            from backend.core.config import settings
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, transport="websockets")
        client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
        client.ws_set_options(path=settings.MQTT_PATH)
        client.tls_set(cert_reqs=ssl.CERT_REQUIRED)
        client.on_connect = self.on_connect
        client.on_message = self.on_message
        client.reconnect_delay_set(min_delay=1, max_delay=60)
        return client

    @staticmethod
    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code == 0:
            print("Connected to MQTT")
            for car_id in CAR_IDS:
                topic = f"car/{car_id}/data/LastRFID"
                result, mid = client.subscribe(topic)
                print(f"Subscribed to {topic}: result={result}, mid={mid}")
        else:
            print("Connection failed:", reason_code)

    def start(self):
        if self.client is not None:
            return self.client
        settings = self.settings
        if settings is None:
            from backend.core.config import settings
        self.client = self.create()
        self.client.connect(settings.MQTT_HOST, settings.MQTT_PORT)
        print("Waiting for RFID scans...")
        self.client.loop_start()
        return self.client

    def stop(self):
        if self.client is None:
            return
        self.client.loop_stop()
        self.client.disconnect()
        self.client = None
