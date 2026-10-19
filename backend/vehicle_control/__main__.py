"""Run vehicle control without the FastAPI application."""

from backend.core.config import settings
from backend.vehicle_control.service import control

client = control.transport.create()
client.connect(settings.MQTT_HOST, settings.MQTT_PORT)
client.loop_forever()
