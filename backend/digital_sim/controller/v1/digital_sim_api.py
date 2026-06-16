import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from backend.digital_sim.service.simulation_service import SimulationService
from backend.digital_sim.constants import UPDATES_PER_SECOND
from backend.digital_sim.utils.sim_speed_util import get_steps_multiplier
from backend.digital_sim.controller.v1.simulation_validator import SimulationStartPayload, SetSpeedPayload


router = APIRouter(prefix="/digital-sim")

@router.get("/status")
async def get_status():
    return {"status": "Digital Sim API is running"}


@router.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[digital_sim_api] Client connected")
    
    simulation_service = SimulationService()
    simulation_task = None
    simulation_config = {"steps_multiplier": 1}
    
    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("command")

            match command:
                case "start":
                    try:
                        # Validate incoming parameters using Pydantic models
                        parameters = SimulationStartPayload(**data.get("parameters", {}))
                        params_dict = parameters.model_dump()
                        result = simulation_service.start_simulation(params_dict)
                    
                        # Send confirmation that simulation has started
                        await websocket.send_json({
                            "command": "simulation_started",
                            "result": result
                        })
                        
                        # Get simulation speed and convert to steps multiplier
                        simulation_speed = parameters.simulationSpeed
                        simulation_config["steps_multiplier"] = get_steps_multiplier(simulation_speed)
                        
                        # Create simulation loop to advance simulation steps
                        simulation_task = asyncio.create_task(
                            _run_simulation_loop(websocket, simulation_service, simulation_config)
                        )
                        
                    except ValidationError as e:
                        print(f"[digital_sim_api] Validation error in start: {e}")
                        await websocket.send_json({
                            "command": "error",
                            "result": {
                                "type": "validation_error",
                            },
                        })
                
                case "stop":
                    result = simulation_service.stop_simulation()
                
                    if simulation_task and not simulation_task.done():
                        simulation_task.cancel()
                    
                    await websocket.send_json({
                        "command": "simulation_stopped",
                        "result": result
                    })
                
                case "set_speed":
                    try:
                        # Validate incoming parameters using Pydantic model
                        speed_payload = SetSpeedPayload(**data.get("parameters", {}))
                        simulation_speed = speed_payload.simulationSpeed
                        simulation_config["steps_multiplier"] = get_steps_multiplier(simulation_speed)

                        await websocket.send_json({
                            "command": "speed_updated",
                            "simulationSpeed": simulation_speed,
                            "stepsMultiplier": simulation_config["steps_multiplier"]
                        })

                    except ValidationError as e:
                        print(f"[digital_sim_api] Validation error in set_speed: {e}")
                        await websocket.send_json({
                            "command": "error",
                            "result": {
                                "type": "validation_error",
                            },
                        })
                
                case "get_stats":
                    stats = simulation_service.get_current_stats()
                    impact = simulation_service.calculate_trip_scores()
                    
                    if stats is None or impact is None:
                        await websocket.send_json({
                            "command": "get_stats",
                            "status": "error",
                            "message": "No simulation running or started"
                        })
                    else:
                        await websocket.send_json({
                            "command": "get_stats",
                            "status": "success",
                            "data": stats,
                            "impact": impact
                        })
                
                case "export_data":
                    csv_data = simulation_service.export_data_as_csv()
                    
                    if csv_data is None:
                        await websocket.send_json({
                            "command": "export_data",
                            "status": "error",
                            "message": "No simulation data available"
                        })
                    else:
                        await websocket.send_json({
                            "command": "export_data",
                            "status": "success",
                            "data": csv_data
                        })
    
    except WebSocketDisconnect:
        print("[digital_sim_api] Client disconnected")
        simulation_service.stop_simulation()
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
    except Exception as e:
        print(f"[digital_sim_api] Error: {e}")
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
            try:
                await simulation_task
            except asyncio.CancelledError:
                pass

        await websocket.send_json({
            "error": str(e)
        })
    finally:
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
            try:
                await simulation_task
            except asyncio.CancelledError:
                pass

        simulation_service.dispose()


async def _run_simulation_loop(websocket: WebSocket, simulation_service: SimulationService, simulation_config: dict):
    """
    Run the simulation loop and send updates to the websocket client.
    This is a background task started by the API.
    
    Executes multiple simulation steps per update cycle based on steps_multiplier.
    Automatically stops when all cars are parked and all packages on selected routes are delivered.
    
    Args:
        websocket: The WebSocket connection to send updates to
        simulation_service: The simulation service instance for this client
        simulation_config: Configuration dictionary containing simulation settings
    """
    update_interval = 1.0 / UPDATES_PER_SECOND
    
    try:
        while simulation_service.is_running:
            steps_multiplier = simulation_config.get("steps_multiplier", 1)

            # Execute multiple steps based on multiplier
            for _ in range(steps_multiplier):
                step_result = simulation_service.execute_step()
                
                # Stop inner loop if simulation ended
                if not simulation_service.is_running:
                    break
            
            # Send update to client after all steps
            try:
                await websocket.send_json({
                    "command": "simulation_update",
                    "result": step_result
                })
            except Exception as e:
                print(f"[digital_sim_api] Error sending simulation update: {e}")
                break
            
            await asyncio.sleep(update_interval)
        
        # Simulation has auto-stopped - send final notification
        if simulation_service.model and not simulation_service.is_running:
            try:
                await websocket.send_json({
                    "command": "simulation_ended",
                    "reason": "All cars parked and all packages delivered",
                    "result": simulation_service.model.get_simulation_state()
                })
            except Exception as e:
                print(f"[digital_sim_api] Error sending simulation_ended message: {e}")
    
    except asyncio.CancelledError:
        print("[digital_sim_api] Simulation loop cancelled")
    except Exception as e:
        print(f"[digital_sim_api] Error in simulation loop: {e}")

