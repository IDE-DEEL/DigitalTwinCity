import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.digital_sim.service.simulation_service import SimulationService
from backend.digital_sim.constants import STEPS_PER_SECOND


router = APIRouter(prefix="/api/v1/digital-sim")

@router.get("/status")
async def get_status():
    return {"status": "Digital Sim API is running"}


@router.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[digital_sim_api] Client connected")
    
    simulation_service = SimulationService()
    simulation_task = None
    
    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("command")

            match command:
                case "start":
                    parameters = data.get("parameters", {})
                    result = simulation_service.start_simulation(parameters)
                
                    # Send confirmation that simulation has started
                    await websocket.send_json({
                        "command": "simulation_started",
                        "result": result
                    })
                    
                    # Get simulation speed and convert to steps multiplier
                    simulation_speed = parameters.get("simulationSpeed", 1)
                    steps_multiplier = _get_steps_multiplier(simulation_speed)
                    
                    # Create simulation loop to advance simulation steps
                    simulation_task = asyncio.create_task(
                        _run_simulation_loop(websocket, simulation_service, steps_multiplier)
                    )
                
                case "stop":
                    result = simulation_service.stop_simulation()
                
                    if simulation_task and not simulation_task.done():
                        simulation_task.cancel()
                    
                    await websocket.send_json({
                        "command": "simulation_stopped",
                        "result": result
                    })
                
                case "get_stats":
                    stats = simulation_service.get_current_stats()
                    
                    if stats is None:
                        await websocket.send_json({
                            "command": "get_stats",
                            "status": "error",
                            "message": "No simulation running or started"
                        })
                    else:
                        await websocket.send_json({
                            "command": "get_stats",
                            "status": "success",
                            "data": stats
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
        await websocket.send_json({
            "error": str(e)
        })


async def _run_simulation_loop(websocket: WebSocket, simulation_service: SimulationService, steps_multiplier: int = 1):
    """
    Run the simulation loop and send updates to the websocket client.
    This is a background task started by the API.
    
    Executes multiple simulation steps per update cycle based on steps_multiplier.
    Automatically stops when all cars are parked and all packages on selected routes are delivered.
    
    Args:
        websocket: The WebSocket connection to send updates to
        simulation_service: The simulation service instance for this client
        steps_multiplier: Number of simulation steps to execute per update cycle
    """
    step_interval = 1.0 / STEPS_PER_SECOND
    
    try:
        while simulation_service.is_running:
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
            
            await asyncio.sleep(step_interval)
        
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

def _get_steps_multiplier(simulation_speed: int) -> int:
    """
    Convert simulation speed value to steps multiplier.
    
    Args:
        simulation_speed: Numeric value from frontend (1, 2, or 3)
        
    Returns:
        Number of steps to execute per update cycle
    """
    speed_to_multiplier = {
        1: 1,      # 1x speed: 1 step per update
        2: 2,      # 2x speed: 2 steps per update
        3: 200,    # Super fast: many steps per update
    }
    return speed_to_multiplier.get(simulation_speed, 1)
