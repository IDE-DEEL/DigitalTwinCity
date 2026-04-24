import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.digital_sim.service.simulation_service import SimulationService


router = APIRouter(prefix="/api/v1/digital-sim")

@router.get("/status")
async def get_status():
    return {"status": "Digital Sim API is running"}


@router.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    
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
                    
                    # Create simulation loop to advance simulation steps
                    simulation_task = asyncio.create_task(
                        _run_simulation_loop(websocket, simulation_service)
                    )
                
                case "stop":
                    result = simulation_service.stop_simulation()
                
                    if simulation_task and not simulation_task.done():
                        simulation_task.cancel()
                    
                    await websocket.send_json({
                        "command": "simulation_stopped",
                        "result": result
                    })
    
    except WebSocketDisconnect:
        simulation_service.stop_simulation()
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
    except Exception as e:
        print(f"Error: {e}")
        if simulation_task and not simulation_task.done():
            simulation_task.cancel()
        await websocket.send_json({
            "error": str(e)
        })


async def _run_simulation_loop(websocket: WebSocket, simulation_service: SimulationService):
    """
    Run the simulation loop and send updates to the websocket client.
    This is a background task started by the API.
    
    Args:
        websocket: The WebSocket connection to send updates to
        simulation_service: The simulation service instance for this client
    """
    step_interval = 1.0 / SimulationService.STEPS_PER_SECOND
    
    try:
        while simulation_service.is_running:
            step_result = simulation_service.step()
            
            # Send update to client
            try:
                await websocket.send_json({
                    "command": "simulation_update",
                    "step": step_result.get("step"),
                    "agents": step_result.get("agents", [])
                })
            except Exception as e:
                print(f"Error sending simulation update: {e}")
                break
            
            await asyncio.sleep(step_interval)
    
    except asyncio.CancelledError:
        print("Simulation loop cancelled")
    except Exception as e:
        print(f"Error in simulation loop: {e}")