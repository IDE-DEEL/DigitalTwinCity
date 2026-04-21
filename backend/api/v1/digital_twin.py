from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/ws/digital_twin")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        print("Client connected")
        while True:
            data = await websocket.receive_json()
            await websocket.send_json({
                "status": "success",
                "received": data,
                "message": "Data succesvol verwerkt"
            })
            print(data)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")