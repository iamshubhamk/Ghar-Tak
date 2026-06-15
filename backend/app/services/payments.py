from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass(frozen=True)
class PaymentResult:
    status: str
    reference_id: str | None = None


class PaymentService(Protocol):
    def mark_paid_cash(self, booking_id: str, amount: Decimal | None = None) -> PaymentResult:
        """Record a cash payment for a completed booking."""


class CashPaymentService:
    def mark_paid_cash(self, booking_id: str, amount: Decimal | None = None) -> PaymentResult:
        return PaymentResult(status="PAID_CASH", reference_id=booking_id)


class OnlinePaymentService:
    def mark_paid_cash(self, booking_id: str, amount: Decimal | None = None) -> PaymentResult:
        raise NotImplementedError("Online payments will be added after MVP validation.")
