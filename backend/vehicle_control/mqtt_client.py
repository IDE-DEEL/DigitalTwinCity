"""MQTT connection lifecycle for physical vehicle control."""

import ssl
import logging

import paho.mqtt.client as mqtt

from backend.core.error_logging import log_unexpected_error
from backend.vehicle_control.state import CAR_IDS

logger = logging.getLogger(__name__)


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
        client.on_message = self._handle_message
        client.reconnect_delay_set(min_delay=1, max_delay=60)
        return client

    def _handle_message(self, client, userdata, message):
        try:
            self.on_message(client, userdata, message)
        except Exception as error:
            log_unexpected_error(logger, "Vehicle MQTT message handling failed", error)

    @staticmethod
    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code != 0:
            logger.error("MQTT broker rejected the connection")
            return
        try:
            failures = 0
            for car_id in CAR_IDS:
                topic = f"car/{car_id}/data/LastRFID"
                result, mid = client.subscribe(topic)
                if result != mqtt.MQTT_ERR_SUCCESS:
                    failures += 1
            if failures:
                logger.error("MQTT RFID subscription requests failed (%d of %d)", failures, len(CAR_IDS))
        except Exception as error:
            log_unexpected_error(logger, "MQTT RFID subscription setup failed", error)

    def start(self):
        if self.client is not None:
            return self.client
        settings = self.settings
        if settings is None:
            from backend.core.config import settings
        client = self.create()
        self.client = client
        try:
            result = client.connect(settings.MQTT_HOST, settings.MQTT_PORT)
            if isinstance(result, int) and result != mqtt.MQTT_ERR_SUCCESS:
                raise ConnectionError("MQTT connection could not be started")
            result = client.loop_start()
            if isinstance(result, int) and result != mqtt.MQTT_ERR_SUCCESS:
                raise ConnectionError("MQTT network loop could not be started")
        except Exception:
            self.client = None
            # Preserve the original failure; its caller owns the single error log.
            for cleanup in (client.loop_stop, client.disconnect):
                try:
                    cleanup()
                except Exception:
                    pass
            raise
        return client

    def stop(self):
        if self.client is None:
            return
        self.client.loop_stop()
        self.client.disconnect()
        self.client = None
