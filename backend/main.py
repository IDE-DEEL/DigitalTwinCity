import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from api.v1 import results_api
from backend.data.db.database import Base, engine

app = FastAPI(title="DEEL - Digital Twin",
              version="0.1.0",
              docs_url="/docs",
              redoc_url="/redoc",
              prefix="/api/v1"
)

app.add_middleware(
  CORSMiddleware,
  allow_origins = ["*"],
  allow_methods = ["*"],
  allow_headers = ["*"]
)

app.include_router(results_api.router)
Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)