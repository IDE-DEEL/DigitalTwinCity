import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.digital_sim.controller.v1 import digital_sim_api

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"],
)

app.include_router(digital_sim_api.router)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)