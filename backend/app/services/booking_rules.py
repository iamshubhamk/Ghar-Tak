"""The one booking transition table (T1-04, Rule 8).

Every status change by a customer, provider or admin is checked here. Nothing else in the codebase
decides whether a transition is allowed. Changing a rule means changing this table and its tests.
"""

from enum import StrEnum

from app.core.enums import BookingStatus as S
from app.core.errors import AppErrorCode, app_http_error


class Actor(StrEnum):
    CUSTOMER = "CUSTOMER"
    PROVIDER = "PROVIDER"
    ADMIN = "ADMIN"


# (who, current status) -> statuses they may move the booking to.
TRANSITIONS: dict[tuple[Actor, S], frozenset[S]] = {
    (Actor.CUSTOMER, S.REQUESTED): frozenset({S.CANCELLED_BY_CUSTOMER}),
    (Actor.CUSTOMER, S.ACCEPTED): frozenset({S.CANCELLED_BY_CUSTOMER}),
    (Actor.PROVIDER, S.REQUESTED): frozenset({S.ACCEPTED, S.REJECTED}),
    (Actor.PROVIDER, S.ACCEPTED): frozenset({S.ON_THE_WAY, S.IN_PROGRESS}),
    (Actor.PROVIDER, S.ON_THE_WAY): frozenset({S.IN_PROGRESS}),
    (Actor.PROVIDER, S.IN_PROGRESS): frozenset({S.COMPLETED}),
    (Actor.ADMIN, S.REQUESTED): frozenset({S.CANCELLED_BY_ADMIN}),
    (Actor.ADMIN, S.ACCEPTED): frozenset({S.CANCELLED_BY_ADMIN}),
    (Actor.ADMIN, S.ON_THE_WAY): frozenset({S.CANCELLED_BY_ADMIN}),
    (Actor.ADMIN, S.IN_PROGRESS): frozenset({S.CANCELLED_BY_ADMIN, S.COMPLETED}),
}

# Admin (re)assignment keeps or resets the booking to REQUESTED; it is only allowed from these.
ASSIGNABLE_FROM: frozenset[S] = frozenset({S.REQUESTED, S.REJECTED})

# Provider endpoint -> status it asks for. `in_progress` is a deprecated alias of `start`.
PROVIDER_ACTION_TARGETS: dict[str, S] = {
    "accept": S.ACCEPTED,
    "reject": S.REJECTED,
    "on_the_way": S.ON_THE_WAY,
    "start": S.IN_PROGRESS,
    "in_progress": S.IN_PROGRESS,
    "complete": S.COMPLETED,
}


def can_transition(actor: Actor, current: S, target: S) -> bool:
    return target in TRANSITIONS.get((actor, current), frozenset())


def ensure_transition(actor: Actor, current: S, target: S) -> None:
    if not can_transition(actor, current, target):
        raise app_http_error(
            422,
            AppErrorCode.BOOKING_INVALID_STATUS,
            f"A booking that is {current.value} cannot be changed to {target.value} "
            f"by the {actor.value.lower()}.",
            {"current": current.value, "requested": target.value, "actor": actor.value},
        )


def ensure_assignable(current: S) -> None:
    if current not in ASSIGNABLE_FROM:
        raise app_http_error(
            422,
            AppErrorCode.BOOKING_INVALID_STATUS,
            "Provider can only be assigned while a request is pending or rejected.",
            {"current": current.value},
        )
