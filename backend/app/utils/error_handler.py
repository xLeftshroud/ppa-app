from __future__ import annotations

import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


# --------------- custom exceptions ---------------

class AppError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: list[Any] | None = None):
        self.code = code
        self.message = message
        self.status = status
        self.details = details or []


class CsvParseError(AppError):
    def __init__(self, message: str = "CSV parsing failed", details: list[Any] | None = None):
        super().__init__("CSV_PARSE_ERROR", message, 400, details)


class CsvSchemaInvalid(AppError):
    def __init__(self, message: str = "CSV validation failed", details: list[Any] | None = None):
        super().__init__("CSV_SCHEMA_INVALID", message, 422, details)


class BaselineNotFound(AppError):
    def __init__(self, message: str = "Baseline not found for given SKU and customer"):
        super().__init__("BASELINE_NOT_FOUND", message, 404)


class InferenceError(AppError):
    def __init__(self, message: str = "Model inference failed", details: list[Any] | None = None):
        super().__init__("INFERENCE_ERROR", message, 500, details)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation error", details: list[Any] | None = None):
        super().__init__("VALIDATION_ERROR", message, 422, details)


# --------------- request-id middleware ---------------

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response


# --------------- exception handlers ---------------

def _build_error_response(request: Request, code: str, message: str, status: int, details: list[Any]):
    request_id = getattr(getattr(request, "state", None), "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
                "request_id": request_id,
            }
        },
    )


async def app_error_handler(request: Request, exc: AppError):
    return _build_error_response(request, exc.code, exc.message, exc.status, exc.details)


async def generic_error_handler(request: Request, exc: Exception):
    return _build_error_response(request, "INTERNAL_ERROR", str(exc), 500, [])


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, generic_error_handler)
