import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.api.manager import ConnectionManager
from backend.baanvlakreservering.baanvlakreservering import (
    add_car_data_listener,
    getTag,
    drive_command,
    load_packages,
    reset,
    max_packets,
    retrieve_packages_per_house
)
from backend.score.scoreCalculator import TripData, calculate_score
from backend.score.config import  WEIGHTS, TRIP
from backend.domain.states import state

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

def load_all_car_packages(car_data):
    for car in car_data:
        max_packets[car["auto_id"]] = car["pakketje"]
        load_packages(car["auto_id"], car["pakketje"], 1500, "load")

@router.websocket("/ws/digital_twin")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    ensure_car_data_broadcaster()
    await manager.broadcast_update("car_data", getTag())

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            print(data)
            payload = data.get("payload")
            await manager.broadcast_update("houses", retrieve_packages_per_house())

            try:
                match msg_type:
                    case "speed":
                        await manager.broadcast_update(msg_type, payload)

                    case "route":
                        print("Case werkt: ", payload)
                        if payload["car_id"] in state.chosen_route:
                            state.chosen_route[payload["car_id"]] = payload["route"]

                            print(type(payload))
                            print(payload)

                            await manager.broadcast_update(
                                msg_type,
                                {
                                    "car_id": payload["car_id"],
                                    "route": state.chosen_route[payload["car_id"]]
                                }
                            )

                    case "scenario":
                        await manager.broadcast_update(msg_type, payload)

                    case "activation":
                        state.start = payload
                        print(f"Activation state changed to: {state.start}")
                        drive_command("auto_A", state.start)
                        drive_command("auto_B", state.start)
                        drive_command("auto_C", state.start)
                        drive_command("auto_D", state.start)
                        drive_command("auto_E", state.start)
                        await manager.broadcast_update("activation", state.start)

                        if state.start == False:
                            await manager.broadcast_update("results", calculate_score(TRIP, WEIGHTS))

                    case "car_data":
                        await manager.broadcast_update("car_data", getTag())

                    case "load_max_packages":
                        load_all_car_packages(payload)

                    case "reset":
                        reset()

                    case "car_packages":
                        await manager.broadcast_update(msg_type, payload)

                    case "car_status":
                        await manager.broadcast_update(msg_type, payload)

                    case "car_energy":
                        await manager.broadcast_update(msg_type, payload)
            except Exception as e:
                print(f"Error handling message {msg_type}: {e}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
