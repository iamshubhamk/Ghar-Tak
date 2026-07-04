import { Banknote, CalendarClock, CheckCircle2, PlayCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { Booking } from "../types/booking";
import { ProviderProfile } from "../types/marketplace";
import { NotificationPanel } from "./NotificationPanel";

type BookingFilter = "all" | "active" | "completed";

export function ProviderBookingsPanel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [amountByBooking, setAmountByBooking] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<BookingFilter>("all");
  const [status, setStatus] = useState("");

  const loadBookings = async () => {
    try {
      const providerResponse = await apiRequest<ProviderProfile>("/provider/me");
      setProvider(providerResponse);

      if (providerResponse.verification_status !== "VERIFIED") {
        setBookings([]);
        setStatus("Your profile is under review. Booking requests unlock after admin approval.");
        return;
      }

      const response = await apiRequest<Booking[]>("/provider/bookings");
      setBookings(response);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Provider bookings unavailable.");
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "completed") {
      return booking.status === "COMPLETED";
    }
    if (filter === "active") {
      return booking.status !== "COMPLETED";
    }
    return true;
  });

  useEffect(() => {
    void loadBookings();
  }, []);

  const act = async (bookingId: string, action: "accept" | "reject" | "start" | "complete") => {
    try {
      await apiRequest<Booking>(`/provider/bookings/${bookingId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify(
          action === "complete" && amountByBooking[bookingId]
            ? { final_amount: Number(amountByBooking[bookingId]) }
            : {}
        )
      });
      await loadBookings();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Booking update failed.");
    }
  };

  const markCashPaid = async (bookingId: string) => {
    try {
      await apiRequest<Booking>(`/provider/bookings/${bookingId}/mark-cash-paid`, {
        method: "PATCH",
        body: JSON.stringify(
          amountByBooking[bookingId] ? { final_amount: Number(amountByBooking[bookingId]) } : {}
        )
      });
      await loadBookings();
      setStatus("Cash payment marked paid.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not mark cash paid.");
    }
  };

  return (
    <section className="operations-section" aria-labelledby="provider-bookings-heading">
      <div className="section-heading">
        <p className="eyebrow">Provider dashboard</p>
        <h2 id="provider-bookings-heading">Booking requests</h2>
      </div>

      <NotificationPanel />

      <div className="operation-panel booking-history">
        <h3>
          <CalendarClock size={20} aria-hidden="true" />
          Assigned bookings
        </h3>

        <div className="mode-tabs booking-tabs" role="tablist" aria-label="Booking filter">
          <button
            aria-selected={filter === "all"}
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
            type="button"
          >
            All
          </button>
          <button
            aria-selected={filter === "active"}
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
            type="button"
          >
            Active
          </button>
          <button
            aria-selected={filter === "completed"}
            className={filter === "completed" ? "active" : ""}
            onClick={() => setFilter("completed")}
            type="button"
          >
            Completed
          </button>
        </div>

        <div className="booking-list">
          {provider?.verification_status !== "VERIFIED" ? (
            <p className="empty-state">
              Provider bookings are available after admin approval.
            </p>
          ) : null}
          {provider?.verification_status === "VERIFIED" && filteredBookings.length === 0 ? (
            <p className="muted-copy">No booking requests yet.</p>
          ) : null}
          {filteredBookings.map((booking) => (
            <article className="booking-item booking-item--with-actions" key={booking.id}>
              <div>
                <strong>{booking.category_name}</strong>
                <span>{booking.customer_name}</span>
                <small>
                  {booking.locality} - {new Date(booking.preferred_datetime).toLocaleString()}
                </small>
                <small>{booking.issue_description}</small>
                <small>
                  Contact: {booking.customer_phone ?? "No phone"}{" "}
                  {booking.customer_email ? `| ${booking.customer_email}` : ""}
                </small>
                <small>
                  Payment: {booking.payment_status}
                  {booking.final_amount ? ` | INR ${booking.final_amount}` : ""}
                </small>
              </div>
              <span className="status-badge">{booking.status}</span>
              <div className="inline-actions">
                {booking.status === "REQUESTED" ? (
                  <>
                    <button aria-label="Accept booking" onClick={() => void act(booking.id, "accept")} type="button">
                      <CheckCircle2 size={18} aria-hidden="true" />
                    </button>
                    <button aria-label="Reject booking" onClick={() => void act(booking.id, "reject")} type="button">
                      <XCircle size={18} aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                {booking.status === "ACCEPTED" ? (
                  <button aria-label="Start booking" onClick={() => void act(booking.id, "start")} type="button">
                    <PlayCircle size={18} aria-hidden="true" />
                  </button>
                ) : null}
                {booking.status === "IN_PROGRESS" ? (
                  <>
                    <input
                      aria-label="Final amount"
                      className="inline-amount"
                      min={0}
                      onChange={(event) =>
                        setAmountByBooking((current) => ({
                          ...current,
                          [booking.id]: event.target.value
                        }))
                      }
                      placeholder="INR"
                      type="number"
                      value={amountByBooking[booking.id] ?? ""}
                    />
                    <button aria-label="Complete booking" onClick={() => void act(booking.id, "complete")} type="button">
                      <CheckCircle2 size={18} aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                {booking.status === "COMPLETED" && booking.payment_status !== "PAID_CASH" ? (
                  <button aria-label="Mark cash paid" onClick={() => void markCashPaid(booking.id)} type="button">
                    <Banknote size={18} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {status ? <p className="form-status operations-status">{status}</p> : null}
    </section>
  );
}
