from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SavedAddressCreate(BaseModel):
    tag: str = Field(..., max_length=50)
    full_address: str = Field(..., max_length=500)
    pincode: str = Field(..., max_length=10)
    is_default: bool = False


class SavedAddressResponse(BaseModel):
    id: str
    tag: str
    full_address: str
    pincode: str
    is_default: bool

    model_config = ConfigDict(from_attributes=True)


class PaymentMethodCreate(BaseModel):
    type: str = Field(..., max_length=20)  # 'upi' or 'card'
    title: str = Field(..., max_length=100)
    detail: str = Field(..., max_length=100)
    is_default: bool = False


class PaymentMethodResponse(BaseModel):
    id: str
    type: str
    title: str
    detail: str
    is_default: bool

    model_config = ConfigDict(from_attributes=True)


class WalletTransactionResponse(BaseModel):
    id: str
    type: str
    amount: float
    title: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WalletResponse(BaseModel):
    balance: float
    transactions: list[WalletTransactionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

