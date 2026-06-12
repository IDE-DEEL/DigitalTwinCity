import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.api.manager import ConnectionManager
from backend.baanvlakreservering.baanvlakreservering import (
    add_car_data_listener,
    getTag,
)

router = APIRouter()
manager = ConnectionManager()
_car_data_listener_registered = False


def ensure_car_data_broadcaster():
    global _car_data_listener_registered
    if _car_data_listener_registered:
        return

    loop = asyncio.get_running_loop()

    def broadcast_car_data(car_data):
        if loop.is_closed():
            return

        asyncio.run_coroutine_threadsafe(
            manager.broadcast_update("car_data", car_data),
            loop,
        )

    add_car_data_listener(broadcast_car_data)
    _car_data_listener_registered = True

@router.websocket("/ws/digital_twin")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    ensure_car_data_broadcaster()
    await websocket.send_json({"type": "car_data", "payload": getTag()})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            print(data)
            payload = data.get("payload")

            match msg_type:
                case "speed":
                    await manager.broadcast_update(msg_type, payload)

                case "scenario":
                    await manager.broadcast_update(msg_type, payload)

                case "activation":
                    await manager.broadcast_update(msg_type, payload)

                case "car_data":
                    await manager.broadcast_update("car_data", getTag())

                case "car_packages":
                    await manager.broadcast_update(msg_type, payload)

                case "car_status":
                    await manager.broadcast_update(msg_type, payload)

                case "car_energy":
                    await manager.broadcast_update(msg_type, payload)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
