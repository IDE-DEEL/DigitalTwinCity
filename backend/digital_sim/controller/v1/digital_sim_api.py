import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from backend.digital_sim.service.simulation_service import SimulationService
from backend.digital_sim.constants import UPDATES_PER_SECOND
from backend.digital_sim.utils.sim_speed_util import get_steps_multiplier
from backend.digital_sim.controller.v1.simulation_validator import (
    SimulationStartPayload,
    SetSpeedPayload,
)


router = APIRouter(prefix="/digital-sim")


@router.get("/status")
async def get_status():
    return {"status": "Digital Sim API is running"}


@router.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[digital_sim_api] Client connected")

    simulation_service = SimulationService()
    simulation_service.is_paused = False
    simulation_task = None
    simulation_config = {"steps_multiplier": 1}

    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("command")

            match command:
                case "start":
                    try:
                        parameters = SimulationStartPayload(
                            **data.get("parameters", {})
                        )
                        params_dict = parameters.model_dump()

                        # Stop any previous loop before creating a new model.
                        if simulation_task and not simulation_task.done():
                            simulation_task.cancel()
                            try:
                                await simulation_task
                            except asyncio.CancelledError:
                                pass

                        result = simulation_service.start_simulation(params_dict)
                        simulation_service.is_paused = False

                        simulation_speed = parameters.simulationSpeed
                        simulation_config["steps_multiplier"] = (
                            get_steps_multiplier(simulation_speed)
                        )

                        await websocket.send_json({
                            "command": "simulation_started",
                            "result": result,
                        })

                        simulation_task = asyncio.create_task(
                            _run_simulation_loop(
                                websocket,
                                simulation_service,
                                simulation_config,
                            )
                        )

                    except ValidationError as e:
                        print(
                            f"[digital_sim_api] Validation error in start: {e}"
                        )
                        await websocket.send_json({
                            "command": "error",
                            "result": {
                                "type": "validation_error",
                            },
                        })

                case "stop":
                    result = simulation_service.stop_simulation()
                    simulation_service.is_paused = False

                    if simulation_task and not simulation_task.done():
                        simulation_task.cancel()
                        try:
                            await simulation_task
                        except asyncio.CancelledError:
                            pass

                    await websocket.send_json({
                        "command": "simulation_stopped",
                        "result": result,
                    })

                case "pause":
                    if simulation_service.is_running:
                        simulation_service.is_paused = True

                        await websocket.send_json({
                            "command": "simulation_paused",
                            "result": {
                                "status": "simulation_paused",
                            },
                        })
                    else:
                        await websocket.send_json({
                            "command": "error",
                            "result": {
                                "type": "invalid_state",
                                "message": "No active simulation to pause",
                            },
                        })

                case "resume":
                    if (
                        simulation_service.is_running
                        and simulation_service.is_paused
                    ):
                        simulation_service.is_paused = False

                        await websocket.send_json({
                            "command": "simulation_resumed",
                            "result": {
                                "status": "simulation_running",
                            },
                        })
                    else:
                        await websocket.send_json({
                            "command": "error",
                            "result": {
                                "type": "invalid_state",
                                "message": "No paused simulation to resume",
                            },
                        })

                case "set_speed":
                    try:
                        speed_payload = SetSpeedPayload(
                            **data.get("parameters", {})
                        )
                        simulation_speed = speed_payload.simulationSpeed
                        simulation_config["steps_multiplier"] = (
                            get_steps_multiplier(simulation_speed)
                        )

                        await websocket.send_json({
                            "command": "speed_updated",
                            "simulationSpeed": simulation_speed,
                            "stepsMultiplier": (
                                simulation_config["steps_multiplier"]
                            ),
                        })

                    except ValidationError as e:
                        print(
                            f"[digital_sim_api] Validation error in set_speed: {e}"
                        )
                        await websocket.send_json({
                            "command": "error",
                            "result": {
                                "type": "validation_error",
                            },
                        })

                case "get_stats":
                    stats = simulation_service.get_current_statistics()

                    if stats is None:
                        await websocket.send_json({
                            "command": "get_stats",
                            "status": "error",
                            "message": "No simulation running or started",
                        })
                    else:
                        await websocket.send_json({
                            "command": "get_stats",
                            "status": "success",
                            "data": stats,
                        })

                case "export_data":
                    csv_data = simulation_service.export_data_as_csv()

                    if csv_data is None:
                        await websocket.send_json({
                            "command": "export_data",
                            "status": "error",
                            "message": "No simulation data available",
                        })
                    else:
                        await websocket.send_json({
                            "command": "export_data",
                            "status": "success",
                            "data": csv_data,
                        })

    except WebSocketDisconnect:
        print("[digital_sim_api] Client disconnected")

    except Exception as e:
        print(f"[digital_sim_api] Error: {e}")

        simulation_service.stop_simulation()

        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
            try:
                await simulation_task
            except asyncio.CancelledError:
                pass

        try:
            await websocket.send_json({
                "error": str(e),
            })
        except Exception:
            pass

    finally:
        simulation_service.stop_simulation()
        simulation_service.is_paused = False

        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
            try:
                await simulation_task
            except asyncio.CancelledError:
                pass

        simulation_service.dispose()


async def _run_simulation_loop(
    websocket: WebSocket,
    simulation_service: SimulationService,
    simulation_config: dict,
):
    """
    Advance the simulation and send updates to the WebSocket client.

    While paused, keep the loop alive without executing model steps.
    """
    update_interval = 1.0 / UPDATES_PER_SECOND

    try:
        while simulation_service.is_running:
            if simulation_service.is_paused:
                await asyncio.sleep(update_interval)
                continue

            steps_multiplier = simulation_config.get("steps_multiplier", 1)
            step_result = None

            for _ in range(steps_multiplier):
                step_result = simulation_service.execute_step()

                if step_result.get("status") in (
                    "simulation_completed",
                    "simulation_deadlocked",
                ):
                    break

                if not simulation_service.is_running:
                    break

            if step_result:
                try:
                    status = step_result.get("status")

                    if status == "simulation_deadlocked":
                        await websocket.send_json({
                            "command": "simulation_deadlocked",
                            "reason": "Simulation entered a deadlock state",
                            "result": step_result,
                        })

                    elif status == "simulation_completed":
                        await websocket.send_json({
                            "command": "simulation_ended",
                            "reason": (
                                "All cars parked and all packages delivered"
                            ),
                            "result": step_result,
                        })

                    else:
                        await websocket.send_json({
                            "command": "simulation_update",
                            "result": step_result,
                        })

                except Exception as e:
                    print(
                        f"[digital_sim_api] Error sending simulation update: {e}"
                    )
                    simulation_service.stop_simulation()
                    break

            if simulation_service.is_running:
                await asyncio.sleep(update_interval)

    except asyncio.CancelledError:
        print("[digital_sim_api] Simulation loop cancelled")
        raise

    except Exception as e:
        print(f"[digital_sim_api] Error in simulation loop: {e}")
        simulation_service.stop_simulation()