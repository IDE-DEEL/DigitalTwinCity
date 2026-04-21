from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/api/v1/digital-sim")

@router.get("/status")
async def get_status():
    return {"status": "Digital Sim API is running"}

@router.websocket("/ws/simulation")
async def websocket_simulation_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected")
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("command") == "start":
                parameters = data.get("parameters")
                
                # TODO: remove later when backend logic is implemented
                await websocket.send_json({
                    "command": "simulation_started",
                    "parameters": parameters
                })
                
            elif data.get("command") == "stop":
                await websocket.send_json({
                    "command": "simulation_stopped"
                })
    
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")