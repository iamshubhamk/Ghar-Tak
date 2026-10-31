"""Basic rate limits for login, refresh and password reset (T2-03, ADR 0003 §9).

Deliberately simple: counters live in this process's memory. That is right for the single API
instance we run today. If we ever run several instances the counters must move to MongoDB (the
public functions here would keep their shape). Counters reset when the server restarts.

What is limited:
  * login      per IP (all attempts), and WRONG passwords per account+IP and per account;
  * refresh    per IP;
  * reset      per IP.
Every limit answers 429 `RATE_LIMITED` with a `Retry-After` header.
"""

import threading
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Request

from app.core.config import get_settings
from app.core.errors import AppErrorCode, app_http_error

MAX_TRACKED_KEYS = 50_000  # memory guard: the oldest keys are dropped beyond this


@dataclass(frozen=True)
class Policy:
    limit: int  # how many events are allowed ...
    window_seconds: int  # ... within this many seconds


# Numbers are generous for people and tight for scripts. Tests change them with monkeypatch.
POLICIES: dict[str, Policy] = {
    "login_ip": Policy(30, 60),
    "login_account_ip_failures": Policy(5, 15 * 60),
    "login_account_failures": Policy(20, 60 * 60),
    "refresh_ip": Policy(60, 60),
    "reset_ip": Policy(10, 10 * 60),
}


class RateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def reset(self) -> None:
        with self._lock:
            self._events.clear()

    def _prune(self, key: str, window: int, now: float) -> deque[float]:
        events = self._events.setdefault(key, deque())
        while events and events[0] <= now - window:
            events.popleft()
        return events

    def retry_after(self, key: str, policy: Policy) -> int:
        """0 when another event is allowed, otherwise seconds until it will be."""
        with self._lock:
            now = self._clock()
            events = self._prune(key, policy.window_seconds, now)
            if len(events) < policy.limit:
                return 0
            return max(1, int(events[0] + policy.window_seconds - now) + 1)

    def record(self, key: str, policy: Policy) -> None:
        with self._lock:
            now = self._clock()
            self._prune(key, policy.window_seconds, now).append(now)
            if len(self._events) > MAX_TRACKED_KEYS:  # drop the oldest keys
                for stale in list(self._events)[: len(self._events) - MAX_TRACKED_KEYS]:
                    del self._events[stale]

    def clear(self, key: str) -> None:
        with self._lock:
            self._events.pop(key, None)


limiter = RateLimiter()


def too_many(retry_after: int):
    error = app_http_error(
        429,
        AppErrorCode.RATE_LIMITED,
        f"Too many attempts. Please try again in {retry_after} seconds.",
        {"retry_after_seconds": retry_after},
    )
    error.headers = {"Retry-After": str(retry_after)}
    return error


def client_ip(request: Request) -> str:
    """The caller's address. Behind Render's proxy the real client is the LAST entry the proxy
    appended to X-Forwarded-For (TRUSTED_PROXY_COUNT proxies deep); entries further left can be
    forged by the caller, so they are ignored. With TRUSTED_PROXY_COUNT=0 the header is not trusted."""
    trusted = get_settings().trusted_proxy_count
    forwarded = request.headers.get("x-forwarded-for", "")
    parts = [part.strip() for part in forwarded.split(",") if part.strip()]
    if trusted > 0 and len(parts) >= trusted:
        return parts[-trusted]
    return request.client.host if request.client else "unknown"


def enabled() -> bool:
    return get_settings().rate_limit_enabled


def ip_limit(policy_name: str) -> Callable[[Request], None]:
    """A route dependency: count every call per IP and answer 429 when over the policy."""

    def dependency(request: Request) -> None:
        if not enabled():
            return
        policy = POLICIES[policy_name]
        key = f"{policy_name}:{client_ip(request)}"
        wait = limiter.retry_after(key, policy)
        if wait:
            raise too_many(wait)
        limiter.record(key, policy)

    return dependency


# ---------- login: wrong passwords per account ----------


def _account_keys(identifier: str, ip: str) -> tuple[str, str]:
    who = identifier.strip().lower()
    return f"login_account_ip_failures:{who}:{ip}", f"login_account_failures:{who}"


def ensure_login_not_locked(identifier: str, request: Request) -> None:
    """Refuse (429) before even checking the password when this account has too many recent
    failures, from this IP or overall. A right password does not help while locked."""
    if not enabled():
        return
    per_pair, per_account = _account_keys(identifier, client_ip(request))
    wait = max(
        limiter.retry_after(per_pair, POLICIES["login_account_ip_failures"]),
        limiter.retry_after(per_account, POLICIES["login_account_failures"]),
    )
    if wait:
        raise too_many(wait)


def record_login_failure(identifier: str, request: Request) -> None:
    if not enabled():
        return
    per_pair, per_account = _account_keys(identifier, client_ip(request))
    limiter.record(per_pair, POLICIES["login_account_ip_failures"])
    limiter.record(per_account, POLICIES["login_account_failures"])


def clear_login_failures(identifier: str, request: Request) -> None:
    """A successful login clears this IP's failures for the account (not the account-wide ones)."""
    per_pair, _ = _account_keys(identifier, client_ip(request))
    limiter.clear(per_pair)
