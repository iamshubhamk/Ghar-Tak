import { CalendarClock, MapPin, Star, UserRound, Wrench } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { Booking, Review } from "../types/booking";
import { Category, ProviderProfile } from "../types/marketplace";
import { NotificationPanel } from "./NotificationPanel";

type CustomerDashboardProps = {
  pendingCategoryName?: string;
};

export function CustomerDashboard({ pendingCategoryName }: CustomerDashboardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [reviewsByProvider, setReviewsByProvider] = useState<Record<string, Review[]>>({});
  const [categoryId, setCategoryId] = useState("");
  const [locality, setLocality] = useState("");
  const [preferredDateTime, setPreferredDateTime] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [reviewByBooking, setReviewByBooking] = useState<Record<string, { rating: string; comment: string }>>({});
  const [status, setStatus] = useState("");

  const loadInitialData = async () => {
    try {
      const [categoryResponse, bookingResponse, providerResponse] = await Promise.all([
        apiRequest<Category[]>("/categories"),
        apiRequest<Booking[]>("/bookings/my"),
        apiRequest<ProviderProfile[]>("/providers")
      ]);
      setCategories(categoryResponse);
      setBookings(bookingResponse);
      setProviders(providerResponse);
      if (!categoryId) {
        const requestedCategoryName = pendingCategoryName?.trim().toLowerCase();
        const pendingCategory = categoryResponse.find(
          (category) => category.name.toLowerCase() === requestedCategoryName
        );
        setCategoryId((pendingCategory ?? categoryResponse[0])?.id ?? "");
        if (requestedCategoryName && !pendingCategory) {
          setStatus(
            `${pendingCategoryName} is not available yet. Choose another service or ask admin to check categories.`
          );
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Customer data unavailable.");
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const canCreateBooking = Boolean(categoryId && locality.trim() && preferredDateTime && issueDescription.trim());

  const createBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    try {
      const booking = await apiRequest<Booking>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          category_id: categoryId,
          locality,
          preferred_datetime: new Date(preferredDateTime).toISOString(),
          issue_description: issueDescription
        })
      });
      setBookings((current) => [booking, ...current]);
      setIssueDescription("");
      setStatus("Booking requested. Admin will review it and assign a verified provider.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Booking failed.");
    }
  };

  const submitReview = async (bookingId: string) => {
    const draft = reviewByBooking[bookingId] ?? { rating: "5", comment: "" };
    try {
      await apiRequest<Review>(`/bookings/${bookingId}/review`, {
        method: "POST",
        body: JSON.stringify({
          rating: Number(draft.rating || 5),
          comment: draft.comment
        })
      });
      setStatus("Review submitted. Thank you for helping other customers.");
      setReviewByBooking((current) => {
        const next = { ...current };
        delete next[bookingId];
        return next;
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Review failed.");
    }
  };

  const loadProviderReviews = async (providerId: string) => {
    try {
      const reviews = await apiRequest<Review[]>(`/providers/${providerId}/reviews`);
      setReviewsByProvider((current) => ({ ...current, [providerId]: reviews }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Provider reviews unavailable.");
    }
  };

  return (
    <section className="dashboard-section" aria-labelledby="customer-dashboard-heading">
      <div className="section-heading">
        <p className="eyebrow">Customer dashboard</p>
        <h2 id="customer-dashboard-heading">Request a service</h2>
      </div>

      <div className="booking-stepper" aria-label="Booking steps">
        <div className={categoryId ? "step-item complete" : "step-item active"}>
          <span>1</span>
          Choose service
        </div>
        <div className={locality.trim() && preferredDateTime ? "step-item complete" : "step-item"}>
          <span>2</span>
          Add locality and time
        </div>
        <div className={canCreateBooking ? "step-item complete" : "step-item"}>
          <span>3</span>
          Submit for admin assignment
        </div>
      </div>

      <div className="dashboard-grid">
        <NotificationPanel />

        <div className="operation-panel">
          <h3>
            <MapPin size={20} aria-hidden="true" />
            Service details
          </h3>

          <label>
            Category
            <select
              disabled={categories.length === 0}
              onChange={(event) => setCategoryId(event.target.value)}
              value={categoryId}
            >
              {categories.length === 0 ? <option value="">No categories available</option> : null}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {category.price_label ? ` - ${category.price_label}` : " - Custom quote"}
                </option>
              ))}
            </select>
          </label>

          <label>
            Locality
            <input
              onChange={(event) => setLocality(event.target.value)}
              placeholder="Boring Road"
              required
              value={locality}
            />
          </label>

          {categories.length === 0 ? (
            <p className="empty-state">
              No services are available yet. Ask admin to run the seed categories script or create
              categories.
            </p>
          ) : null}

          <p className="empty-state">
            GharTak admin request review karke verified provider assign karega for{" "}
            {selectedCategory?.name ?? "the selected service"}.{" "}
            {selectedCategory
              ? selectedCategory.price_label ?? "Final amount will be quoted after review."
              : null}
          </p>
        </div>

        <form className="operation-panel" onSubmit={createBooking}>
          <h3>
            <Wrench size={20} aria-hidden="true" />
            Booking request
          </h3>

          <div className="selected-provider-summary">
            <span>Assignment</span>
            <strong>Admin assigns provider after review</strong>
          </div>

          <label>
            Preferred Date and Time
            <input
              onChange={(event) => setPreferredDateTime(event.target.value)}
              required
              type="datetime-local"
              value={preferredDateTime}
            />
          </label>

          <label>
            Issue Description
            <textarea
              minLength={5}
              onChange={(event) => setIssueDescription(event.target.value)}
              required
              rows={3}
              value={issueDescription}
            />
          </label>

          <button className="primary-action auth-submit" disabled={!canCreateBooking} type="submit">
            Request Booking
          </button>
        </form>
      </div>

      <div className="operation-panel booking-history">
        <h3>
          <CalendarClock size={20} aria-hidden="true" />
          My bookings
        </h3>

        <div className="booking-list">
          {bookings.length === 0 ? <p className="muted-copy">No bookings yet.</p> : null}
          {bookings.map((booking) => (
            <article className="booking-item" key={booking.id}>
              <div>
                <strong>{booking.category_name}</strong>
                <span>{booking.provider_name ?? "Awaiting admin assignment"}</span>
                <small>{new Date(booking.preferred_datetime).toLocaleString()}</small>
                <small>Payment: {booking.payment_status}</small>
              </div>
              <span className="status-badge">{booking.status}</span>
              {booking.status === "COMPLETED" ? (
                <div className="review-inline">
                  <select
                    aria-label={`Rating for ${booking.category_name}`}
                    onChange={(event) =>
                      setReviewByBooking((current) => ({
                        ...current,
                        [booking.id]: {
                          rating: event.target.value,
                          comment: current[booking.id]?.comment ?? ""
                        }
                      }))
                    }
                    value={reviewByBooking[booking.id]?.rating ?? "5"}
                  >
                    <option value="5">5 stars</option>
                    <option value="4">4 stars</option>
                    <option value="3">3 stars</option>
                    <option value="2">2 stars</option>
                    <option value="1">1 star</option>
                  </select>
                  <input
                    aria-label={`Review comment for ${booking.category_name}`}
                    onChange={(event) =>
                      setReviewByBooking((current) => ({
                        ...current,
                        [booking.id]: {
                          rating: current[booking.id]?.rating ?? "5",
                          comment: event.target.value
                        }
                      }))
                    }
                    placeholder="Share feedback"
                    value={reviewByBooking[booking.id]?.comment ?? ""}
                  />
                  <button onClick={() => void submitReview(booking.id)} type="button">
                    Review
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      <div className="operation-panel booking-history provider-directory">
        <h3>
          <UserRound size={20} aria-hidden="true" />
          Verified providers
        </h3>

        <div className="provider-directory-grid">
          {providers.length === 0 ? <p className="muted-copy">No verified providers yet.</p> : null}
          {providers.map((provider) => (
            <article className="provider-profile-card" key={provider.id}>
              <div>
                <strong>{provider.name}</strong>
                <span>{provider.bio ?? "Verified local provider"}</span>
                <small>{provider.categories.join(", ") || "Services updating"}</small>
                <small>{provider.localities.join(", ") || "Patna"}</small>
                <small>{provider.price_note ?? "Service price confirmed after inspection"}</small>
              </div>
              <div className="rating-line">
                <Star size={16} aria-hidden="true" />
                <span>
                  {provider.average_rating.toFixed(1)} ({provider.total_reviews})
                </span>
              </div>
              <button
                className="secondary-action"
                onClick={() => void loadProviderReviews(provider.id)}
                type="button"
              >
                Reviews
              </button>
              {reviewsByProvider[provider.id] ? (
                <div className="review-snippets">
                  {reviewsByProvider[provider.id].length === 0 ? (
                    <small>No reviews yet.</small>
                  ) : null}
                  {reviewsByProvider[provider.id].slice(0, 3).map((review) => (
                    <small key={review.id}>
                      {review.rating}/5 - {review.comment ?? "No comment"}
                    </small>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {status ? <p className="form-status operations-status">{status}</p> : null}
    </section>
  );
}
