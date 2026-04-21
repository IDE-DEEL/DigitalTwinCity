import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from api.v1 import results_api
from backend.api.v1 import digital_twin
from backend.data.db.database import Base, engine

app = FastAPI(title="DEEL - Digital Twin",
              version="0.1.0",
              docs_url="/docs",
              redoc_url="/redoc",
)

app.add_middleware(
  CORSMiddleware,
  allow_origins = ["*"],
  allow_methods = ["*"],
  allow_headers = ["*"]
)

api_v1_prefix = "/api/v1"
app.include_router(results_api.router, prefix=api_v1_prefix)
app.include_router(digital_twin.router, prefix=api_v1_prefix)

Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)