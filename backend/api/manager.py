import logging

from fastapi import WebSocket, WebSocketDisconnect

from backend.core.error_logging import log_unexpected_error

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_update(self, update_type: str, data: object):
        message = {"type": update_type, "payload": data}
        for connection in tuple(self.active_connections):
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                self.disconnect(connection)
            except Exception as error:
                self.disconnect(connection)
                log_unexpected_error(logger, "Digital twin broadcast failed", error)
