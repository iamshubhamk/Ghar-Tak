import { BriefcaseBusiness, MapPin, ToggleLeft, ToggleRight } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { apiBaseUrl } from "../lib/config";
import { Category, ProviderProfile } from "../types/marketplace";

export function ProviderOnboardingPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [bio, setBio] = useState("");
  const [priceNote, setPriceNote] = useState("");
  const [localities, setLocalities] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [adhaarFile, setAdhaarFile] = useState<File | null>(null);

  const loadData = async () => {
    try {
      const categoryResponse = await apiRequest<Category[]>("/categories");
      setCategories(categoryResponse);

      try {
        const providerResponse = await apiRequest<ProviderProfile>("/provider/me");
        setProvider(providerResponse);
        setBio(providerResponse.bio ?? "");
        setPriceNote(providerResponse.price_note ?? "");
        setLocalities(providerResponse.localities.join(", "));
        setSelectedCategories([]);
      } catch {
        setProvider(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Provider data unavailable.");
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    try {
      const response = await apiRequest<ProviderProfile>("/provider/me", {
        method: "PATCH",
        body: JSON.stringify({
          bio,
          price_note: priceNote,
          category_ids: selectedCategories.length > 0 ? selectedCategories : undefined,
          localities: localities
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        })
      });
      setProvider(response);
      setStatus("Provider profile updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save provider profile.");
    }
  };

  const uploadDocuments = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    if (!photoFile && !adhaarFile) {
      setStatus("Please select at least one file to upload.");
      return;
    }

    const formData = new FormData();
    if (photoFile) formData.append("profile_photo", photoFile);
    if (adhaarFile) formData.append("adhaar_card", adhaarFile);

    try {
      const response = await fetch(`${apiBaseUrl}/provider/me/documents`, {
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
      setProvider(data);
      setStatus("Documents uploaded successfully.");
      setPhotoFile(null);
      setAdhaarFile(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const reraiseVerification = async () => {
    try {
      const response = await apiRequest<ProviderProfile>("/provider/me/reraise", {
        method: "POST"
      });
      setProvider(response);
      setStatus("Verification request re-raised successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to re-raise verification.");
    }
  };

  const toggleAvailability = async () => {
    if (!provider) {
      setStatus("Login as a provider first.");
      return;
    }

    if (provider.verification_status !== "VERIFIED") {
      setStatus("Your profile must be approved before you can receive bookings.");
      return;
    }

    const nextStatus =
      provider.availability_status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";

    try {
      const response = await apiRequest<ProviderProfile>("/provider/me/availability", {
        method: "PATCH",
        body: JSON.stringify({ availability_status: nextStatus })
      });
      setProvider(response);
      setStatus(`Availability set to ${nextStatus}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update availability.");
    }
  };

  return (
    <section className="operations-section operations-section--soft" aria-labelledby="provider-heading">
      <div className="section-heading">
        <p className="eyebrow">Provider onboarding</p>
        <h2 id="provider-heading">Build a verified service profile</h2>
      </div>

      <div className="dashboard-grid">
        <form className="operation-panel provider-profile-form" onSubmit={saveProfile}>
          <h3>
            <BriefcaseBusiness size={20} aria-hidden="true" />
            Service profile
          </h3>

          {provider?.verification_status === "PENDING_VERIFICATION" ? (
            <div className="review-state review-state--pending">
              <strong>Profile under review</strong>
              <span>
                Your provider profile is submitted. GharTak admin will verify it before your services
                become visible to customers.
              </span>
            </div>
          ) : null}

          {provider?.verification_status === "REJECTED" ? (
            <div className="review-state review-state--rejected">
              <strong>Profile rejected</strong>
              <span>Reason: {provider.rejection_reason || "Please update your profile details."}</span>
              <button 
                type="button" 
                className="secondary-action" 
                onClick={reraiseVerification}
                style={{ marginTop: '10px' }}
              >
                Re-raise Verification Request
              </button>
            </div>
          ) : null}

          <label>
            Bio
            <textarea onChange={(event) => setBio(event.target.value)} rows={3} value={bio} />
          </label>

          <label>
            Price Note
            <input onChange={(event) => setPriceNote(event.target.value)} value={priceNote} />
          </label>

          <label>
            <span className="label-row">
              <MapPin size={16} aria-hidden="true" />
              Localities
            </span>
            <input
              onChange={(event) => setLocalities(event.target.value)}
              placeholder="Boring Road, Kankarbagh"
              value={localities}
            />
          </label>

          <div className="category-checkbox-grid" aria-label="Provider categories">
            {categories.length === 0 ? (
              <p className="empty-state">No service categories are available yet.</p>
            ) : null}
            {categories.map((category) => (
              <label key={category.id}>
                <input
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                  type="checkbox"
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>

          <div className="provider-actions">
            <button className="primary-action" type="submit">
              Save Profile
            </button>
            <button className="secondary-action provider-toggle" onClick={toggleAvailability} type="button">
              {provider?.availability_status === "AVAILABLE" ? (
                <ToggleRight size={18} aria-hidden="true" />
              ) : (
                <ToggleLeft size={18} aria-hidden="true" />
              )}
              {provider?.availability_status ?? "UNAVAILABLE"}
            </button>
          </div>

          {provider ? (
            <p className="form-status">
              Verification: {provider.verification_status}. Public profile:{" "}
              {provider.is_public ? "Yes" : "No"}.
            </p>
          ) : null}
        </form>

        <form className="operation-panel" onSubmit={uploadDocuments}>
          <h3>Verification Documents</h3>
          <p className="muted-copy" style={{ fontSize: '14px', marginBottom: '16px' }}>
            Upload your documents for admin verification.
          </p>

          <label>
            Profile Photo (JPG/JPEG)
            <input 
              type="file" 
              accept=".jpg,.jpeg,image/jpeg"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
            {provider?.profile_photo_url && (
              <small style={{ color: 'green' }}>✓ Photo uploaded</small>
            )}
          </label>

          <label>
            Adhaar Card (PDF)
            <input 
              type="file" 
              accept=".pdf,application/pdf"
              onChange={(e) => setAdhaarFile(e.target.files?.[0] || null)}
            />
            {provider?.adhaar_card_url && (
              <small style={{ color: 'green' }}>✓ Adhaar card uploaded</small>
            )}
          </label>

          <button className="primary-action" type="submit" disabled={!photoFile && !adhaarFile}>
            Upload Documents
          </button>

          {status ? <p className="form-status operations-status">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}
