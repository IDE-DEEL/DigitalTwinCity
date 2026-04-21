import uvicorn
from fastapi import FastAPI

from backend.digital_sim.controller.v1 import digital_sim_api

app = FastAPI()

app.include_router(digital_sim_api.router)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)