"""One error shape for the whole API (T2-08, ADR 0006 §6, done the Rule 7 way).

Every error answer now carries the new flat shape under `error`:

    {"error": {"code": "BOOKING_INVALID_STATUS", "message": "...", "details": {...}}, ...}

and, for one release, the OLD body under `detail` exactly as before, so clients that read
`detail.error.code` (or a plain `detail` string) keep working while they move to `error`.
"""

from typing import Any

from app.core.errors import AppErrorCode

# Codes for errors raised with only a text message (older routes, unknown URLs, wrong methods).
STATUS_CODES: dict[int, str] = {
    400: "BAD_REQUEST",
    401: AppErrorCode.AUTH_REQUIRED,
    403: AppErrorCode.FORBIDDEN,
    404: AppErrorCode.NOT_FOUND,
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: AppErrorCode.UPLOAD_TOO_LARGE,
    415: AppErrorCode.UPLOAD_TYPE_NOT_ALLOWED,
    422: AppErrorCode.VALIDATION_ERROR,
    423: AppErrorCode.OTP_LOCKED,
    429: AppErrorCode.RATE_LIMITED,
}


def error_content(status_code: int, detail: Any) -> dict[str, Any]:
    """The JSON body for an error: the new `error` object plus the old `detail`, unchanged."""
    if isinstance(detail, dict) and isinstance(detail.get("error"), dict):
        inner = detail["error"]
        error = {
            "code": inner.get("code", "ERROR"),
            "message": inner.get("message", ""),
            "details": inner.get("details") or {},
        }
    else:
        default = AppErrorCode.SERVER_ERROR if status_code >= 500 else "ERROR"
        error = {
            "code": STATUS_CODES.get(status_code, default),
            "message": detail if isinstance(detail, str) else "The request could not be completed.",
            "details": {},
        }
    return {"error": error, "detail": detail}
