from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        print("Client disconnected")
        self.active_connections.remove(websocket)

    async def broadcast_update(self, update_type: str, data: any):
        message = {
            "type": update_type,
            "payload": data
        }
        for connection in self.active_connections:
            await connection.send_json(message)