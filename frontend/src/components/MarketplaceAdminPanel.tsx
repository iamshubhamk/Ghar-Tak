import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  FolderPlus,
  MessageSquareOff,
  ShieldCheck,
  UsersRound,
  UserCheck,
  XCircle
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { AdminCustomer, AdminDashboardSummary } from "../types/admin";
import { Booking, BookingStatus, Review } from "../types/booking";
import { Category, ProviderProfile } from "../types/marketplace";
import { NotificationPanel } from "./NotificationPanel";

export function MarketplaceAdminPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedProviderByBooking, setSelectedProviderByBooking] = useState<Record<string, string>>({});
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | "ALL">("ALL");
  const [bookingCategoryFilter, setBookingCategoryFilter] = useState("");
  const [bookingProviderFilter, setBookingProviderFilter] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");

  const loadAdminData = async () => {
    try {
      const [categoryResponse, providerResponse, bookingResponse, summaryResponse, customerResponse, reviewResponse] =
        await Promise.all([
          apiRequest<Category[]>("/admin/categories"),
          apiRequest<ProviderProfile[]>("/admin/providers"),
          apiRequest<Booking[]>("/admin/bookings"),
          apiRequest<AdminDashboardSummary>("/admin/summary"),
          apiRequest<AdminCustomer[]>("/admin/customers"),
          apiRequest<Review[]>("/admin/reviews")
        ]);
      setCategories(categoryResponse);
      setProviders(providerResponse);
      setBookings(bookingResponse);
      setSummary(summaryResponse);
      setCustomers(customerResponse);
      setReviews(reviewResponse);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin data unavailable.");
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    try {
      await apiRequest<Category>("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryName,
          description
        })
      });
      setCategoryName("");
      setDescription("");
      await loadAdminData();
      setStatus("Category created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create category.");
    }
  };

  const verifyProvider = async (providerId: string, action: "approve" | "reject") => {
    setStatus("");

    try {
      await apiRequest<ProviderProfile>(`/admin/providers/${providerId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
      await loadAdminData();
      setStatus(action === "approve" ? "Provider approved." : "Provider rejected.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update provider.");
    }
  };

  const assignProvider = async (bookingId: string) => {
    const providerId = selectedProviderByBooking[bookingId];
    if (!providerId) {
      setStatus("Select a verified provider first.");
      return;
    }

    setStatus("");

    try {
      await apiRequest<Booking>(`/admin/bookings/${bookingId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ provider_id: providerId })
      });
      await loadAdminData();
      setStatus("Provider assigned to booking.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not assign provider.");
    }
  };

  const markCashPaid = async (bookingId: string) => {
    setStatus("");

    try {
      await apiRequest<Booking>(`/admin/bookings/${bookingId}/mark-cash-paid`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
      await loadAdminData();
      setStatus("Cash payment marked paid.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not mark cash paid.");
    }
  };

  const updateBookingStatus = async (bookingId: string, nextStatus: BookingStatus) => {
    setStatus("");

    try {
      await apiRequest<Booking>(`/admin/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      await loadAdminData();
      setStatus("Booking status updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update booking status.");
    }
  };

  const moderateReview = async (reviewId: string, action: "hide" | "show") => {
    setStatus("");

    try {
      await apiRequest<Review>(`/admin/reviews/${reviewId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
      await loadAdminData();
      setStatus(action === "hide" ? "Review hidden." : "Review visible again.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not moderate review.");
    }
  };

  const verifiedProviders = providers.filter((provider) => provider.verification_status === "VERIFIED");
  const pendingProviders = providers.filter(
    (provider) => provider.verification_status === "PENDING_VERIFICATION"
  );
  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = bookingStatusFilter === "ALL" || booking.status === bookingStatusFilter;
    const matchesCategory = !bookingCategoryFilter || booking.category_id === bookingCategoryFilter;
    const matchesProvider = !bookingProviderFilter || booking.provider_id === bookingProviderFilter;
    return matchesStatus && matchesCategory && matchesProvider;
  });

  const bookingStatusOptions: BookingStatus[] = [
    "REQUESTED",
    "ACCEPTED",
    "REJECTED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED_BY_CUSTOMER",
    "CANCELLED_BY_PROVIDER",
    "CANCELLED_BY_ADMIN"
  ];

  return (
    <section className="operations-section" aria-labelledby="admin-heading">
      <div className="section-heading">
        <p className="eyebrow">Admin operations</p>
        <h2 id="admin-heading">Categories, providers, and bookings</h2>
      </div>

      {summary ? (
        <div className="summary-grid" aria-label="Admin dashboard summary">
          <div className="summary-card">
            <span>Customers</span>
            <strong>{summary.total_customers}</strong>
          </div>
          <div className="summary-card">
            <span>Providers</span>
            <strong>{summary.total_providers}</strong>
            <small>{summary.pending_providers} pending</small>
          </div>
          <div className="summary-card">
            <span>Open bookings</span>
            <strong>{summary.open_bookings}</strong>
          </div>
          <div className="summary-card">
            <span>Completed</span>
            <strong>{summary.completed_bookings}</strong>
          </div>
        </div>
      ) : null}

      <div className="operations-grid">
        <NotificationPanel />

        <form className="operation-panel" onSubmit={createCategory}>
          <h3>
            <FolderPlus size={20} aria-hidden="true" />
            Service categories
          </h3>

          <label>
            Category Name
            <input
              minLength={2}
              onChange={(event) => setCategoryName(event.target.value)}
              required
              value={categoryName}
            />
          </label>

          <label>
            Description
            <textarea
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              value={description}
            />
          </label>

          <button className="primary-action auth-submit" type="submit">
            Create Category
          </button>

          <div className="compact-list">
            {categories.map((category) => (
              <span key={category.id}>{category.name}</span>
            ))}
          </div>
        </form>

        <div className="operation-panel">
          <h3>
            <ShieldCheck size={20} aria-hidden="true" />
            Pending providers
          </h3>

          <div className="provider-review-list">
            {pendingProviders.length === 0 ? <p className="muted-copy">No pending providers.</p> : null}
            {pendingProviders.map((provider) => (
              <article className="provider-review-item" key={provider.id}>
                <div>
                  <strong>{provider.name}</strong>
                  <span>{provider.bio ?? "No bio added"}</span>
                </div>
                <div className="inline-actions">
                  <button
                    aria-label={`Approve ${provider.name}`}
                    onClick={() => void verifyProvider(provider.id, "approve")}
                    type="button"
                  >
                    <CheckCircle2 size={18} aria-hidden="true" />
                  </button>
                  <button
                    aria-label={`Reject ${provider.name}`}
                    onClick={() => void verifyProvider(provider.id, "reject")}
                    type="button"
                  >
                    <XCircle size={18} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="operation-panel booking-history">
          <h3>
            <CalendarClock size={20} aria-hidden="true" />
            Service requests
          </h3>

          <div className="filter-row" aria-label="Booking filters">
            <select
              aria-label="Filter bookings by status"
              onChange={(event) => setBookingStatusFilter(event.target.value as BookingStatus | "ALL")}
              value={bookingStatusFilter}
            >
              <option value="ALL">All statuses</option>
              {bookingStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter bookings by category"
              onChange={(event) => setBookingCategoryFilter(event.target.value)}
              value={bookingCategoryFilter}
            >
              <option value="">All services</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter bookings by provider"
              onChange={(event) => setBookingProviderFilter(event.target.value)}
              value={bookingProviderFilter}
            >
              <option value="">All providers</option>
              {verifiedProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div className="booking-list">
            {filteredBookings.length === 0 ? <p className="muted-copy">No matching booking requests.</p> : null}
            {filteredBookings.map((booking) => {
              const eligibleProviders = verifiedProviders.filter((provider) =>
                provider.categories.includes(booking.category_name)
              );

              return (
                <article className="booking-item booking-item--with-actions" key={booking.id}>
                  <div>
                    <strong>{booking.category_name}</strong>
                    <span>{booking.customer_name}</span>
                    <small>
                      {booking.locality} - {new Date(booking.preferred_datetime).toLocaleString()}
                    </small>
                    <small>{booking.provider_name ?? "Awaiting provider assignment"}</small>
                    <small>
                      Payment: {booking.payment_status}
                      {booking.final_amount ? ` | INR ${booking.final_amount}` : ""}
                    </small>
                  </div>
                  <span className="status-badge">{booking.status}</span>
                  {booking.status === "REQUESTED" || booking.status === "REJECTED" ? (
                    <div className="assignment-controls">
                      <select
                        aria-label={`Assign provider for ${booking.category_name}`}
                        onChange={(event) =>
                          setSelectedProviderByBooking((current) => ({
                            ...current,
                            [booking.id]: event.target.value
                          }))
                        }
                        value={selectedProviderByBooking[booking.id] ?? ""}
                      >
                        <option value="">Select provider</option>
                        {eligibleProviders.map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}
                          </option>
                        ))}
                      </select>
                      <button
                        aria-label="Assign provider"
                        disabled={eligibleProviders.length === 0}
                        onClick={() => void assignProvider(booking.id)}
                        type="button"
                      >
                        <UserCheck size={18} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                  {booking.status !== "COMPLETED" && booking.status !== "CANCELLED_BY_ADMIN" ? (
                    <div className="assignment-controls">
                      <select
                        aria-label={`Update status for ${booking.category_name}`}
                        onChange={(event) => {
                          if (event.target.value) {
                            void updateBookingStatus(booking.id, event.target.value as BookingStatus);
                          }
                        }}
                        value=""
                      >
                        <option value="">Update status</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED_BY_ADMIN">Cancel by admin</option>
                      </select>
                    </div>
                  ) : null}
                  {booking.status === "COMPLETED" && booking.payment_status !== "PAID_CASH" ? (
                    <div className="assignment-controls">
                      <button
                        aria-label="Mark cash paid"
                        onClick={() => void markCashPaid(booking.id)}
                        type="button"
                      >
                        <Banknote size={18} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>

        <div className="operation-panel booking-history">
          <h3>
            <UsersRound size={20} aria-hidden="true" />
            Customers
          </h3>

          <div className="compact-table">
            {customers.length === 0 ? <p className="muted-copy">No customers yet.</p> : null}
            {customers.slice(0, 8).map((customer) => (
              <article key={customer.id}>
                <strong>{customer.name}</strong>
                <span>{customer.phone ?? customer.email ?? "No contact"}</span>
                <small>{customer.default_locality ?? "Locality pending"}</small>
              </article>
            ))}
          </div>
        </div>

        <div className="operation-panel booking-history">
          <h3>
            <MessageSquareOff size={20} aria-hidden="true" />
            Review moderation
          </h3>

          <div className="booking-list">
            {reviews.length === 0 ? <p className="muted-copy">No reviews yet.</p> : null}
            {reviews.slice(0, 8).map((review) => (
              <article className="booking-item booking-item--with-actions" key={review.id}>
                <div>
                  <strong>
                    {review.rating}/5 from {review.customer_name}
                  </strong>
                  <span>{review.comment ?? "No comment"}</span>
                  <small>{review.status}</small>
                </div>
                <span className="status-badge">{review.status}</span>
                <div className="inline-actions">
                  {review.status === "VISIBLE" ? (
                    <button
                      aria-label="Hide review"
                      onClick={() => void moderateReview(review.id, "hide")}
                      type="button"
                    >
                      <XCircle size={18} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      aria-label="Show review"
                      onClick={() => void moderateReview(review.id, "show")}
                      type="button"
                    >
                      <CheckCircle2 size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {status ? <p className="form-status operations-status">{status}</p> : null}
    </section>
  );
}
