import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DEEL - Digital Twin",
              version="0.1.0",
              docs_url="/docs",
              redoc_url="/redoc"
)

app.add_middleware(
  CORSMiddleware,
  allow_origins = ["*"],
  allow_methods = ["*"],
  allow_headers = ["*"]
)

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)