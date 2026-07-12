import logging

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logger import setup_logger
from app.core.errors import AppErrorCode
from app.db.session import get_db
from app.db.init_db import create_database_tables
from app.services.categories import CategoryService
import traceback

settings = get_settings()
logger = setup_logger("ghartak.api")

# Ensure uploads directory exists before mounting StaticFiles
os.makedirs(settings.local_upload_dir, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up GharTak API...")
    db = await anext(get_db())
    await create_database_tables(db)
    await CategoryService(db).ensure_default_categories()
    logger.info("Startup complete. Database and default categories initialized.")
    yield
    logger.info("Shutting down GharTak API...")

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

app.mount("/uploads", StaticFiles(directory=settings.local_upload_dir), name="uploads")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error(f"HTTP 500 error on {request.method} {request.url.path}: {exc.detail}")
    else:
        logger.warning(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
    
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        f"Unhandled Exception on {request.method} {request.url.path}:\n"
        f"{traceback.format_exc()}"
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "error": {
                    "code": AppErrorCode.VALIDATION_ERROR,
                    "message": "Please check the highlighted fields and try again.",
                    "details": {"errors": exc.errors()},
                }
            }
        },
    )


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "GharTak API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
