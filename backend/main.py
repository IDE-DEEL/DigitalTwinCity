import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from backend.api.v1 import results_api
from backend.api.v1 import access_codes_api
from backend.api.v1 import auth_api
from backend.core.config import settings
from backend.data.db.database import Base, engine

app = FastAPI(title="DEEL - Digital Twin",
              version="0.1.0",
              docs_url="/docs",
              redoc_url="/redoc",
)

if settings.cors_allow_origins:
    app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.cors_allow_origins,
      allow_credentials=True,
      allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allow_headers=["Content-Type"],
    )

api_v1_prefix = "/api/v1"
app.include_router(results_api.router, prefix=api_v1_prefix)
app.include_router(access_codes_api.router, prefix=api_v1_prefix)
app.include_router(auth_api.router, prefix=api_v1_prefix)

Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)
