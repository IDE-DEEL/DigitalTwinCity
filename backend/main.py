import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from backend.api.v1 import results_api
from backend.api.v1 import access_codes_api
from backend.api.v1 import auth_api
from backend.core.config import settings
from backend.api.v1 import digital_twin
from backend.api.v1 import car_commands_api, car_logs_api, track_segment_api
from backend.baanvlakreservering.baanvlakreservering import start_mqtt_client, stop_mqtt_client
from backend.data.db.database import Base, engine
from backend.domain import track_segment, car_commands, car_logs # noqa: F401


app = FastAPI(title="DEEL - Digital Twin",
              version="0.1.0",
              docs_url="/docs",
              redoc_url="/redoc",
)

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)

    try:
        start_mqtt_client()
    except Exception as exc:
        print(f"MQTT startup failed: {exc}")


@app.on_event("shutdown")
def shutdown_event():
    stop_mqtt_client()


@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

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
app.include_router(digital_twin.router, prefix=api_v1_prefix)
app.include_router(car_commands_api.router, prefix=api_v1_prefix)
app.include_router(car_logs_api.router, prefix=api_v1_prefix)
app.include_router(track_segment_api.router, prefix=api_v1_prefix)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)
