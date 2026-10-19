import asyncio
import json
import logging

from backend.core.error_logging import log_unexpected_error

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from backend.digital_sim.service.simulation_service import SimulationService, SimulationExportError
from backend.digital_sim.constants import UPDATES_PER_SECOND
from backend.digital_sim.utils.sim_speed_util import get_steps_multiplier
from backend.digital_sim.controller.v1.simulation_validator import (
    SimulationStartPayload,
    SetSpeedPayload,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/digital-sim")


@router.get("/status")
async def get_status():
    return {"status": "Digital Sim API is running"}


@router.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await websocket.accept()

    simulation_service = SimulationService()
    simulation_service.is_paused = False
    simulation_task = None
    simulation_config = {"steps_multiplier": 1}

    try:
        while True:
            try:
                data = await websocket.receive_json()
            except json.JSONDecodeError:
                await websocket.send_json({"command": "error", "result": {"type": "validation_error"}})
                continue
            if not isinstance(data, dict):
                await websocket.send_json({"command": "error", "result": {"type": "validation_error"}})
                continue
            command = data.get("command")

            match command:
                case "start":
                    try:
                        raw_parameters = data.get("parameters", {})
                        if not isinstance(raw_parameters, dict):
                            await websocket.send_json({"command": "error", "result": {"type": "validation_error"}})
                            continue
                        parameters = SimulationStartPayload(**raw_parameters)
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

                    except ValidationError:
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
                        raw_parameters = data.get("parameters", {})
                        if not isinstance(raw_parameters, dict):
                            await websocket.send_json({"command": "error", "result": {"type": "validation_error"}})
                            continue
                        speed_payload = SetSpeedPayload(**raw_parameters)
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

                    except ValidationError:
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
                    try:
                        csv_data = simulation_service.export_data_as_csv()
                    except SimulationExportError:
                        await websocket.send_json({
                            "command": "export_data", "status": "error",
                            "message": "Simulation data could not be exported",
                        })
                        continue

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
        pass
    except Exception as error:
        log_unexpected_error(logger, "Simulation command handling failed", error)
        _halt_simulation(simulation_service)
        await _send_error(websocket, "internal_error", "Simulation command could not be processed")
    finally:
        # Cleanup must not repeat the statistics calculation which may have failed.
        _halt_simulation(simulation_service)
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
            try:
                await simulation_task
            except asyncio.CancelledError:
                pass
        simulation_service.dispose()


def _halt_simulation(service):
    service.is_running = False
    service.is_paused = False


async def _send_error(websocket, error_type, message):
    try:
        await websocket.send_json({
            "command": "error", "result": {"type": error_type, "message": message},
        })
    except Exception:
        # Best effort only; a failed error response is part of the same incident.
        pass


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

                except WebSocketDisconnect:
                    _halt_simulation(simulation_service)
                    break
                except Exception as error:
                    log_unexpected_error(logger, "Simulation update could not be sent", error)
                    _halt_simulation(simulation_service)
                    break

            if simulation_service.is_running:
                await asyncio.sleep(update_interval)

    except asyncio.CancelledError:
        raise

    except Exception as error:
        log_unexpected_error(logger, "Simulation step failed", error)
        _halt_simulation(simulation_service)
        await _send_error(websocket, "simulation_error", "Simulation stopped because a step failed")