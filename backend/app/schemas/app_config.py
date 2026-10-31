from datetime import datetime

from pydantic import BaseModel, Field


class AssignmentPromise(BaseModel):
    """What the app tells the customer about how fast a provider is assigned (ADR 0004)."""

    minutes: int = Field(description="Expected time to assign a provider, in minutes.")
    window_start: str = Field(description="Local start of the service window, HH:MM (24 hour).")
    window_end: str = Field(description="Local end of the service window, HH:MM (24 hour).")
    timezone: str = Field(description="IANA time zone of the window, for example Asia/Kolkata.")


class AppConfigResponse(BaseModel):
    """Public settings the mobile app reads on start-up (T2-04). No login needed."""

    min_supported_version: str = Field(
        description="Versions below this must be blocked with an 'update the app' screen."
    )
    latest_version: str = Field(description="The newest released version (gentle update prompt).")
    play_store_url: str | None = Field(default=None, description="Where the update button goes.")
    support_phone: str | None = Field(default=None, description="Phone number for the help button.")
    visit_charge_inr: float = Field(description="Visit charge in rupees (launch offer).")
    offer_ends_at: datetime | None = Field(
        default=None, description="When the launch offer ends, if it has an end date."
    )
    assignment_promise: AssignmentPromise
    flags: dict[str, bool] = Field(
        default_factory=dict,
        description="Feature switches, for example password_reset_enabled.",
    )
