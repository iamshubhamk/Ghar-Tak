import os
import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Any

from app.api.deps import require_roles
from app.core.config import get_settings
from app.core.enums import UserRole
from app.db.session import get_db
from app.schemas.auth import UserResponse

router = APIRouter(tags=["customers"])

@router.post("/customer/me/photo", response_model=UserResponse)
async def upload_customer_photo(
    profile_photo: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    settings = get_settings()
    
    if not profile_photo.content_type.startswith("image/"):
        raise HTTPException(400, "Profile photo must be an image (JPG/JPEG/PNG).")
    
    ext = os.path.splitext(profile_photo.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.local_upload_dir, filename)
    
    with open(filepath, "wb") as f:
        f.write(await profile_photo.read())
        
    photo_url = f"/uploads/{filename}"
    
    await db.users.update_one(
        {"id": current_user["id"]}, 
        {"$set": {"customer_profile.profile_photo_url": photo_url}}
    )
    
    user = await db.users.find_one({"id": current_user["id"]})
    return user
