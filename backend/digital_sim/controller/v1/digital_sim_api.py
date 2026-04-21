from fastapi import APIRouter, WebSocket

router = APIRouter(prefix="/api/v1/digital-sim")

@router.get("/status")
async def get_status():
    return {"status": "Digital Sim API is running"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message received: {data}")