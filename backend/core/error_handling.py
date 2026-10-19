"""One error boundary for unexpected failures in HTTP request handlers."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.core.error_logging import log_unexpected_error

logger = logging.getLogger(__name__)


def add_error_handling(app: FastAPI) -> None:
    @app.middleware("http")
    async def handle_unexpected_error(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as error:
            log_unexpected_error(logger, "HTTP request handling failed", error)
            return JSONResponse(status_code=500, content={"detail": "Internal server error"})
