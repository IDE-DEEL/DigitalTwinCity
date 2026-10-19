import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.api.manager import ConnectionManager
from backend.core.error_logging import log_unexpected_error
from backend.vehicle_control.service import (
    add_car_data_listener,
    get_car_data,
    drive_command,
    load_packages,
    reset,
    set_capacity,
    retrieve_packages_per_house
)
from backend.score.scoreCalculator import calculate_score
from backend.score.config import  WEIGHTS, TRIP
from backend.domain.states import state
from backend.vehicle_control.state import CAR_IDS

logger = logging.getLogger(__name__)

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

        future = asyncio.run_coroutine_threadsafe(
            manager.broadcast_update("car_data", car_data), loop,
        )
        future.add_done_callback(_check_broadcast_result)

    add_car_data_listener(broadcast_car_data)
    _car_data_listener_registered = True

def _check_broadcast_result(future):
    if future.cancelled():
        return
    try:
        future.result()
    except Exception as error:
        log_unexpected_error(logger, "Scheduled vehicle broadcast failed", error)


async def _send_command_error(websocket):
    try:
        await websocket.send_json({
            "type": "error", "payload": {
                "type": "command_error", "message": "Digital twin command could not be processed",
            },
        })
    except Exception:
        # The original failure is already logged; the connection may be closed.
        pass


def load_all_car_packages(car_data):
    for car in car_data:
        set_capacity(car["auto_id"], car["pakketje"])
        load_packages(car["auto_id"], car["pakketje"], 1500, "load")

@router.websocket("/ws/digital_twin")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        ensure_car_data_broadcaster()
        await manager.broadcast_update("car_data", get_car_data())
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            payload = data.get("payload")
            await manager.broadcast_update("houses", retrieve_packages_per_house())

            try:
                match msg_type:
                    case "speed" | "scenario" | "car_packages" | "car_status" | "car_energy":
                        await manager.broadcast_update(msg_type, payload)

                    case "route":
                        if payload["car_id"] in state.chosen_route:
                            state.chosen_route[payload["car_id"]] = payload["route"]

                            await manager.broadcast_update(
                                msg_type,
                                {
                                    "car_id": payload["car_id"],
                                    "route": state.chosen_route[payload["car_id"]]
                                }
                            )

                    case "activation":
                        state.start = payload
                        for car_id in CAR_IDS:
                            drive_command(car_id, state.start)
                        await manager.broadcast_update("activation", state.start)

                        if state.start == False:
                            await manager.broadcast_update("results", calculate_score(TRIP, WEIGHTS))

                    case "car_data":
                        await manager.broadcast_update("car_data", get_car_data())

                    case "load_max_packages":
                        load_all_car_packages(payload)

                    case "reset":
                        reset()

            except Exception as e:
                log_unexpected_error(logger, "Digital twin command handling failed", e)
                await _send_command_error(websocket)

    except WebSocketDisconnect:
        pass
    except Exception as error:
        log_unexpected_error(logger, "Digital twin connection handling failed", error)
        await _send_command_error(websocket)
    finally:
        manager.disconnect(websocket)
