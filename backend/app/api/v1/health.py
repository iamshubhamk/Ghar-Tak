from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncIOMotorDatabase = Depends(get_db)) -> dict[str, str]:
    database_status = "ok"

    try:
        await db.command("ping")
    except Exception:
        database_status = "unavailable"

    overall_status = "ok" if database_status == "ok" else "degraded"

    return {
        "status": overall_status,
        "database": database_status,
        "service": "ghartak-api",
    }
