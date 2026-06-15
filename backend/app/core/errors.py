from fastapi import HTTPException, status


class AppErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTH_REQUIRED = "AUTH_REQUIRED"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    DUPLICATE_ACCOUNT = "DUPLICATE_ACCOUNT"
    PROVIDER_NOT_VERIFIED = "PROVIDER_NOT_VERIFIED"
    BOOKING_INVALID_STATUS = "BOOKING_INVALID_STATUS"
    REVIEW_NOT_ALLOWED = "REVIEW_NOT_ALLOWED"
    CATEGORY_INACTIVE = "CATEGORY_INACTIVE"
    ACCOUNT_DISABLED = "ACCOUNT_DISABLED"
    SERVER_ERROR = "SERVER_ERROR"


def app_http_error(
    status_code: int,
    code: str,
    message: str,
    details: dict | None = None,
) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            }
        },
    )


def forbidden(message: str = "You do not have permission to perform this action.") -> HTTPException:
    return app_http_error(status.HTTP_403_FORBIDDEN, AppErrorCode.FORBIDDEN, message)
