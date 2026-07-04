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
from app.core.errors import AppErrorCode
from app.db.session import get_db
from app.db.init_db import create_database_tables
from app.services.categories import CategoryService

settings = get_settings()
logger = logging.getLogger("ghartak.api")

# Ensure uploads directory exists before mounting StaticFiles
os.makedirs(settings.local_upload_dir, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Execute startup tasks
    db = await anext(get_db())
    await create_database_tables(db)
    await CategoryService(db).ensure_default_categories()
    yield
    # Shutdown tasks can go here

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
    logger.warning(
        "handled_http_error",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code,
            "detail": exc.detail,
        },
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    logger.warning(
        "request_validation_error",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": exc.errors(),
        },
    )
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
