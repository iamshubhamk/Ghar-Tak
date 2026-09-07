import { CalendarClock, MapPin, Star, UserRound, Wrench } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { apiBaseUrl, backendBaseUrl } from "../lib/config";
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
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [reviewByBooking, setReviewByBooking] = useState<Record<string, {rating: string, comment: string}>>({});

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

  if (!isBooking) {
    return (
      <section className="dashboard-section" aria-labelledby="customer-dashboard-heading">
        <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="eyebrow">Customer dashboard</p>
            <h2 id="customer-dashboard-heading">Overview</h2>
          </div>
          <button 
            className="primary-action" 
            onClick={() => {
              setIsBooking(true);
              setStatus("");
            }} 
            type="button"
          >
            Book New Service
          </button>
        </div>

        <div className="dashboard-grid">
          <NotificationPanel />

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
        </div>
        {status ? <p className="form-status operations-status">{status}</p> : null}
      </section>
    );
  }

  return (
    <section className="dashboard-section" aria-labelledby="customer-dashboard-heading">
      <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">Customer dashboard</p>
          <h2 id="customer-dashboard-heading">Request a service</h2>
        </div>
        <button 
          className="secondary-action" 
          onClick={() => {
            setIsBooking(false);
            setStatus("");
          }} 
          type="button"
        >
          Cancel Booking
        </button>
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
          Submit request
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="operation-panel">
          <h3>
            <MapPin size={20} aria-hidden="true" />
            Service details
          </h3>

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
  );
}
