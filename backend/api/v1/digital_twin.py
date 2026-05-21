from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.api.manager import ConnectionManager
from backend.services.car_service import CarService, get_car_service
from backend.baanvlakreservering.baanvlakreservering import getTag

router = APIRouter()
manager = ConnectionManager()

@router.websocket("/ws/digital_twin")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            print(data)
            payload = data.get("payload")

            car_data = getTag()
            await manager.broadcast_update(msg_type, car_data)
            await websocket.send_json({"type": msg_type, "payload": car_data})

            match msg_type:
                case "speed":
                    await manager.broadcast_update(msg_type, payload)
                    await websocket.send_json({"type":msg_type, "payload":payload})

                case "scenario":
                    await manager.broadcast_update(msg_type, payload)
                    await websocket.send_json({"type": msg_type, "payload": payload})

                case "car_table":
                    await manager.broadcast_update(msg_type, len(payload))
                    await websocket.send_json({"type": msg_type, "payload": payload})


    except WebSocketDisconnect:
        manager.disconnect(websocket)