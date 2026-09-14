import os
import uuid
from datetime import UTC, datetime
from typing import Any
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import require_roles
from app.core.config import get_settings
from app.core.enums import UserRole
from app.db.session import get_db
from app.schemas.auth import UserResponse
from app.schemas.customer import (
    PaymentMethodCreate,
    PaymentMethodResponse,
    SavedAddressCreate,
    SavedAddressResponse,
    WalletResponse,
)

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

    ext = os.path.splitext(profile_photo.filename or "file")[1]
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.local_upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(await profile_photo.read())

    photo_url = f"/uploads/{filename}"

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"customer_profile.profile_photo_url": photo_url}},
    )

    user = await db.users.find_one({"id": current_user["id"]})
    return user


# --- SAVED ADDRESSES ---

@router.get("/customer/me/addresses", response_model=list[SavedAddressResponse])
async def get_my_addresses(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    addresses = user.get("customer_profile", {}).get("addresses", [])
    if not addresses:
        # Default starter addresses for new Patna accounts
        addresses = [
            {
                "id": "addr-1",
                "tag": "Home",
                "full_address": "House No 42, Boring Road, Near High Court, Patna",
                "pincode": "800001",
                "is_default": True,
            },
            {
                "id": "addr-2",
                "tag": "Office",
                "full_address": "3rd Floor, Software Technology Park, Bailey Road, Patna",
                "pincode": "800014",
                "is_default": False,
            },
        ]
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"customer_profile.addresses": addresses}},
        )
    return addresses


@router.post("/customer/me/addresses", response_model=SavedAddressResponse)
async def add_address(
    payload: SavedAddressCreate,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    addresses = user.get("customer_profile", {}).get("addresses", [])

    new_address = {
        "id": f"addr-{uuid.uuid4().hex[:8]}",
        "tag": payload.tag,
        "full_address": payload.full_address,
        "pincode": payload.pincode,
        "is_default": payload.is_default or len(addresses) == 0,
    }

    if payload.is_default:
        for a in addresses:
            a["is_default"] = False

    addresses.append(new_address)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"customer_profile.addresses": addresses}},
    )
    return new_address


@router.put("/customer/me/addresses/{address_id}", response_model=SavedAddressResponse)
async def update_address(
    address_id: str,
    payload: SavedAddressCreate,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    addresses = user.get("customer_profile", {}).get("addresses", [])

    updated_address = None
    for a in addresses:
        if a["id"] == address_id:
            a["tag"] = payload.tag
            a["full_address"] = payload.full_address
            a["pincode"] = payload.pincode
            a["is_default"] = payload.is_default
            updated_address = a
        elif payload.is_default:
            a["is_default"] = False

    if not updated_address:
        raise HTTPException(404, "Address not found")

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"customer_profile.addresses": addresses}},
    )
    return updated_address


@router.delete("/customer/me/addresses/{address_id}")
async def delete_address(
    address_id: str,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    addresses = user.get("customer_profile", {}).get("addresses", [])
    updated_addresses = [a for a in addresses if a["id"] != address_id]

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"customer_profile.addresses": updated_addresses}},
    )
    return {"message": "Address deleted"}


# --- WALLET ---

@router.get("/customer/me/wallet", response_model=WalletResponse)
async def get_my_wallet(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    wallet = user.get("customer_profile", {}).get("wallet", None)
    if not wallet:
        wallet = {
            "balance": 250.0,
            "transactions": [
                {
                    "id": "tx-1",
                    "type": "credit",
                    "amount": 250.0,
                    "title": "Welcome Promo Cashback",
                    "created_at": datetime.now(UTC),
                }
            ],
        }
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"customer_profile.wallet": wallet}},
        )
    return wallet


# --- PAYMENT METHODS ---

@router.get("/customer/me/payment-methods", response_model=list[PaymentMethodResponse])
async def get_my_payment_methods(
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    methods = user.get("customer_profile", {}).get("payment_methods", [])
    if not methods:
        methods = [
            {
                "id": "pm-1",
                "type": "upi",
                "title": "GPay / BHIM UPI",
                "detail": "shubham@okicici",
                "is_default": True,
            }
        ]
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"customer_profile.payment_methods": methods}},
        )
    return methods


@router.post("/customer/me/payment-methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    payload: PaymentMethodCreate,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    methods = user.get("customer_profile", {}).get("payment_methods", [])

    new_method = {
        "id": f"pm-{uuid.uuid4().hex[:8]}",
        "type": payload.type,
        "title": payload.title,
        "detail": payload.detail,
        "is_default": payload.is_default or len(methods) == 0,
    }

    if payload.is_default:
        for m in methods:
            m["is_default"] = False

    methods.append(new_method)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"customer_profile.payment_methods": methods}},
    )
    return new_method


@router.delete("/customer/me/payment-methods/{pm_id}")
async def delete_payment_method(
    pm_id: str,
    current_user: dict[str, Any] = Depends(require_roles(UserRole.CUSTOMER)),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one({"id": current_user["id"]})
    methods = user.get("customer_profile", {}).get("payment_methods", [])
    updated_methods = [m for m in methods if m["id"] != pm_id]

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"customer_profile.payment_methods": updated_methods}},
    )
    return {"message": "Payment method deleted"}
