import { CalendarClock, MapPin, Star, UserRound, Wrench } from "lucide-react";
import { CalendarClock, MapPin, Star, UserRound, Wrench, Plus, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { apiBaseUrl, backendBaseUrl } from "../lib/config";
import { Booking, Review } from "../types/booking";
import { Category, ProviderProfile } from "../types/marketplace";
import { NotificationPanel } from "./NotificationPanel";
import { BookingTracker } from "./BookingTracker";

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
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [reviewByBooking, setReviewByBooking] = useState<Record<string, {rating: string, comment: string}>>({});
  const [reviewByBooking, setReviewByBooking] = useState<Record<string, { rating: string; comment: string }>>({});

  const loadInitialData = async () => {
    try {
      const [categoryResponse, bookingResponse, providerResponse, authResponse] = await Promise.all([
        apiRequest<Category[]>("/categories"),
        apiRequest<Booking[]>("/bookings/my"),
        apiRequest<ProviderProfile[]>("/providers"),
        apiRequest<any>("/auth/me")
      ]);
      setCategories(categoryResponse);
      setBookings(bookingResponse);
      setProviders(providerResponse);
      if (authResponse?.customer_profile?.profile_photo_url) {
        setCustomerPhotoUrl(authResponse.customer_profile.profile_photo_url);
      }
      if (!categoryId) {
        const requestedCategoryName = pendingCategoryName?.trim().toLowerCase();
        const pendingCategory = categoryResponse.find(
          (category) => category.name.toLowerCase() === requestedCategoryName
        );
        setCategoryId((pendingCategory ?? categoryResponse[0])?.id ?? "");
        

        if (requestedCategoryName) {
          setIsBooking(true);
          if (!pendingCategory) {
            setStatus(
              `${pendingCategoryName} is not available yet. Choose another service or ask admin to check categories.`
            );
          }
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
      const payload: Record<string, any> = {
        category_id: categoryId,
        locality,
        preferred_datetime: new Date(preferredDateTime).toISOString(),
        issue_description: issueDescription
      };
      if (selectedProviderId) {
        payload.provider_id = selectedProviderId;
      }

      const booking = await apiRequest<Booking>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setBookings((current) => [booking, ...current]);
      setIssueDescription("");
      setSelectedProviderId("");
      setIsBooking(false); // Return to dashboard
      setStatus(
        selectedProviderId 
          ? "Booking requested. The selected provider will be notified." 
          : "Booking requested. Admin will review it and assign a verified provider."
      );
      setIsBooking(false);
      setStatus("Booking requested successfully! You can track live status below.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Booking failed.");
    }
  };

  const uploadCustomerPhoto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photoFile) return;
    setStatus("");

    const formData = new FormData();
    formData.append("profile_photo", photoFile);

    try {
      const response = await fetch(`${apiBaseUrl}/customer/me/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("ghartak_token")}`
        },
        body: formData
      });
      

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail ?? "Upload failed");
      }
      

      const data = await response.json();
      setCustomerPhotoUrl(data.customer_profile?.profile_photo_url);
      setStatus("Profile photo updated successfully.");
      setPhotoFile(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
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

  // Filter providers that serve the selected category
  const availableProviders = providers.filter((p) => 
    !selectedCategory || p.categories.includes(selectedCategory.name)
  );
  const activeBooking = bookings.find((b) => b.status !== "COMPLETED" && !b.status.startsWith("CANCELLED"));

  if (!isBooking) {
    return (
      <section className="dashboard-section" aria-labelledby="customer-dashboard-heading">
        <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-card">
          <div>
            <p className="eyebrow">Customer dashboard</p>
            <h2 id="customer-dashboard-heading">Overview</h2>
            <div className="text-xs font-black uppercase text-brand-orange tracking-wider">
              Customer Hub
            </div>
            <h1 className="text-2xl font-black text-brand-navy">Welcome back to Ghar-Tak</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Manage your active service requests and profile
            </p>
          </div>
          <button 
            className="primary-action" 
          <button
            onClick={() => {
              setIsBooking(true);
              setStatus("");
            }} 
            type="button"
            }}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all shrink-0"
          >
            Book New Service
            <Plus className="w-4 h-4" />
            <span>Book New Service</span>
          </button>
        </div>

        <div className="dashboard-grid">
          <NotificationPanel />
        {/* Live Active Booking Tracker */}
        {activeBooking && (
          <div>
            <h3 className="text-lg font-black text-brand-navy mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-orange" />
              <span>Live Order Tracking</span>
            </h3>
            <BookingTracker
              booking={{
                id: activeBooking.id,
                service_name: activeBooking.category_name,
                status: activeBooking.status.toLowerCase(),
                scheduled_at: new Date(activeBooking.preferred_datetime).toLocaleString(),
                address: activeBooking.locality,
                provider: activeBooking.provider_name
                  ? { name: activeBooking.provider_name, phone: '9876543210', rating: 4.9 }
                  : undefined,
              }}
            />
          </div>
        )}

          <form className="operation-panel" onSubmit={uploadCustomerPhoto}>
            <h3>
              <UserRound size={20} aria-hidden="true" />
              My Profile
            </h3>
            {customerPhotoUrl && (
              <div style={{ marginBottom: "16px" }}>
                <img 
                  src={`${backendBaseUrl}${customerPhotoUrl}`} 
                  alt="Profile" 
                  style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover" }} 
                />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications */}
          <div className="lg:col-span-2 space-y-6">
            <NotificationPanel />

            {/* Booking History Table / Cards */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-brand-navy flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-brand-orange" />
                  <span>My Booking History</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">{bookings.length} total</span>
              </div>
            )}
            <label>
              Update Profile Photo (JPG/JPEG/PNG)
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </label>
            <button className="primary-action" type="submit" disabled={!photoFile}>
              Upload Photo
            </button>
          </form>

          <div className="operation-panel booking-history">
            <h3>
              <CalendarClock size={20} aria-hidden="true" />
              My bookings
            </h3>
              <div className="space-y-3">
                {bookings.length === 0 && (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">
                    No bookings found. Click "Book New Service" to get started!
                  </div>
                )}
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-extrabold text-sm text-brand-navy">{b.category_name}</div>
                      <div className="text-xs text-slate-500 font-semibold mt-0.5">
                        {b.provider_name ? `Assigned: ${b.provider_name}` : 'Awaiting admin assignment'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {new Date(b.preferred_datetime).toLocaleString()} • {b.locality}
                      </div>
                    </div>

            <div className="booking-list">
              {bookings.length === 0 ? <p className="muted-copy">No bookings yet.</p> : null}
              {bookings.map((booking) => (
                <article className="booking-item" key={booking.id}>
                  <div>
                    <strong>{booking.category_name}</strong>
                    <span>{booking.provider_name ?? "Awaiting admin assignment"}</span>
                    <small>{new Date(booking.preferred_datetime).toLocaleString()}</small>
                    <small>Payment: {booking.payment_status}</small>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize ${
                        b.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {b.status}
                      </span>
                    </div>
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
                ))}
              </div>
            </div>
          </div>

          {/* Profile Card */}
          <div className="space-y-6">
            <form onSubmit={uploadCustomerPhoto} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
              <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                <UserRound className="w-5 h-5 text-brand-orange" />
                <span>My Profile</span>
              </h3>

              {customerPhotoUrl && (
                <div className="flex justify-center py-2">
                  <img
                    src={`${backendBaseUrl}${customerPhotoUrl}`}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-orange-100 shadow-md"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-brand-navy">
                  Upload Profile Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-orange-50 file:text-brand-orange hover:file:bg-orange-100"
                />
              </div>

              <button
                type="submit"
                disabled={!photoFile}
                className="w-full py-3 bg-brand-navy hover:bg-brand-navy-dark text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
              >
                Save Photo
              </button>
            </form>
          </div>
        </div>
        {status ? <p className="form-status operations-status">{status}</p> : null}
      </section>

        {status && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-xs font-bold text-brand-navy">
            {status}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="dashboard-section" aria-labelledby="customer-dashboard-heading">
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Customer dashboard</p>
          <h2 id="customer-dashboard-heading">Request a service</h2>
          <div className="text-xs font-black uppercase text-brand-orange">New Service Request</div>
          <h2 className="text-2xl font-black text-brand-navy">Configure your booking</h2>
        </div>
        <button 
          className="secondary-action" 
        <button
          onClick={() => {
            setIsBooking(false);
            setStatus("");
          }} 
          type="button"
          }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
        >
          Cancel Booking
          Cancel
        </button>
      </div>

      <div className="booking-stepper" aria-label="Booking steps">
        <div className={categoryId ? "step-item complete" : "step-item active"}>
          <span>1</span>
          Choose service
      <form onSubmit={createBooking} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-brand-navy">Select Service Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-brand-ink focus:outline-none focus:border-brand-orange"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.price_label ? `(${c.price_label})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className={locality.trim() && preferredDateTime ? "step-item complete" : "step-item"}>
          <span>2</span>
          Add locality and time

        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-brand-navy">Locality / Address</label>
          <input
            type="text"
            placeholder="e.g. Connaught Place, New Delhi"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
          />
        </div>
        <div className={canCreateBooking ? "step-item complete" : "step-item"}>
          <span>3</span>
          Submit request

        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-brand-navy">Preferred Date & Time</label>
          <input
            type="datetime-local"
            value={preferredDateTime}
            onChange={(e) => setPreferredDateTime(e.target.value)}
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
          />
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="operation-panel">
          <h3>
            <MapPin size={20} aria-hidden="true" />
            Service details
          </h3>
        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-brand-navy">Issue / Requirement Details</label>
          <textarea
            rows={3}
            placeholder="Describe what work needs to be done..."
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
          />
        </div>

          <label>
            Category
            <select
              disabled={categories.length === 0}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setSelectedProviderId(""); // reset provider on category change
              }}
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
        <button
          type="submit"
          disabled={!canCreateBooking}
          className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl font-extrabold text-sm shadow-md transition-all disabled:opacity-50"
        >
          Submit Service Booking
        </button>
      </form>

          <label>
            Locality
            <input
              onChange={(event) => setLocality(event.target.value)}
              placeholder="Boring Road"
              required
              value={locality}
            />
          </label>

          <label>
            Select Provider (Optional)
            <select
              onChange={(event) => setSelectedProviderId(event.target.value)}
              value={selectedProviderId}
            >
              <option value="">
                {availableProviders.length === 0 
                  ? "No providers available for now, admin will assign after reviewing your request" 
                  : "Any verified provider (Admin assigns)"}
              </option>
              {availableProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} (★ {provider.average_rating.toFixed(1)})
                </option>
              ))}
            </select>
          </label>

          {categories.length === 0 ? (
            <p className="empty-state">
              No services are available yet. Admin needs to run the seed categories script or create categories.
            </p>
          ) : null}

      {status && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-xs font-bold text-brand-navy">
          {status}
        </div>

        <form className="operation-panel" onSubmit={createBooking}>
          <h3>
            <Wrench size={20} aria-hidden="true" />
            Booking request
          </h3>

          <div className="selected-provider-summary">
            <span>Assignment</span>
            <strong>
              {selectedProviderId 
                ? providers.find(p => p.id === selectedProviderId)?.name 
                : "Admin assigns provider after review"}
            </strong>
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

      {status ? <p className="form-status operations-status">{status}</p> : null}
    </section>
      )}
    </div>
  );
}
