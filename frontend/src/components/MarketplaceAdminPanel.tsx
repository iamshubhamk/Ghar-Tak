import React, { FormEvent, useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  FolderPlus,
  CalendarClock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Plus,
  UserCheck,
  Building,
  Building2,
  RefreshCw,
  Search,
  FileText,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  Wrench,
  AlertTriangle,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { backendBaseUrl } from "../lib/config";
import { AdminDashboardSummary } from "../types/admin";
import { Booking, BookingStatus, Review } from "../types/booking";
import { Category, ProviderProfile, SkillRequest } from "../types/marketplace";

type AdminTabKey = "overview" | "categories" | "providers" | "bookings";

const PROVIDER_REJECTION_PRESETS = [
  "Aadhaar card document is blurred, unreadable, or cropped.",
  "Aadhaar card name does not match the bank account holder name.",
  "Bank account number or IFSC code provided is invalid or unverified.",
  "Selected trade category does not match experience or skills.",
  "Phone number is unreachable or outside active Patna service areas.",
];

const SKILL_REJECTION_PRESETS = [
  "Proof of work document is unclear or unreadable.",
  "Certificate or proof does not match requested trade category.",
  "Insufficient experience or training evidence provided.",
];

export function MarketplaceAdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");

  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [skillRequests, setSkillRequests] = useState<SkillRequest[]>([]);
  const [selectedProviderByBooking, setSelectedProviderByBooking] = useState<Record<string, string>>({});
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | "ALL">("ALL");

  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [revealedBankAccounts, setRevealedBankAccounts] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [priceLabel, setPriceLabel] = useState("");
  const [status, setStatus] = useState("");

  // In-app Rejection Modal States
  const [rejectingProvider, setRejectingProvider] = useState<ProviderProfile | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const [rejectingSkillRequest, setRejectingSkillRequest] = useState<SkillRequest | null>(null);
  const [skillRejectionReasonText, setSkillRejectionReasonText] = useState("");
  const [isSubmittingSkillRejection, setIsSubmittingSkillRejection] = useState(false);

  const loadAdminData = async () => {
    try {
      const [categoryResponse, providerResponse, bookingResponse, summaryResponse, reviewResponse, skillRequestResponse] =
        await Promise.all([
          apiRequest<Category[]>("/admin/categories"),
          apiRequest<ProviderProfile[]>("/admin/providers"),
          apiRequest<Booking[]>("/admin/bookings"),
          apiRequest<AdminDashboardSummary>("/admin/summary"),
          apiRequest<Review[]>("/admin/reviews"),
          apiRequest<SkillRequest[]>("/admin/skill-requests").catch(() => []),
        ]);
      setCategories(categoryResponse);
      setProviders(providerResponse);
      setBookings(bookingResponse);
      setSummary(summaryResponse);
      setReviews(reviewResponse);
      setSkillRequests(skillRequestResponse);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Admin data unavailable.");
    }
  };

  useEffect(() => {
    void loadAdminData();
    const pollInterval = setInterval(() => {
      void loadAdminData();
    }, 3500);
    return () => clearInterval(pollInterval);
  }, []);

  const createCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    try {
      await apiRequest<Category>("/admin/categories", {
        method: "POST",
        body: JSON.stringify({
          name: categoryName,
          description,
          price_label: priceLabel,
        }),
      });
      setCategoryName("");
      setDescription("");
      setPriceLabel("");
      await loadAdminData();
      setStatus("Category created successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create category.");
    }
  };

  const verifyProvider = async (providerId: string, action: "approve" | "disable") => {
    setStatus("");
    try {
      await apiRequest<ProviderProfile>(`/admin/providers/${providerId}/${action}`, {
        method: "PATCH",
      });
      await loadAdminData();
      setStatus(`Provider ${action}d successfully.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Could not ${action} provider.`);
    }
  };

  const openRejectProviderModal = (provider: ProviderProfile) => {
    setRejectingProvider(provider);
    setRejectionReasonText("");
  };

  const handleConfirmProviderRejection = async () => {
    if (!rejectingProvider) return;
    const reason = rejectionReasonText.trim();
    if (!reason) {
      setStatus("Please specify a reason for rejection.");
      return;
    }
    setIsSubmittingRejection(true);
    try {
      await apiRequest<ProviderProfile>(`/admin/providers/${rejectingProvider.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejection_reason: reason }),
      });
      setRejectingProvider(null);
      setRejectionReasonText("");
      await loadAdminData();
      setStatus(`Application for ${rejectingProvider.name} rejected.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not reject provider.");
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const approveSkillRequest = async (requestId: string) => {
    setStatus("");
    try {
      await apiRequest<SkillRequest>(`/admin/skill-requests/${requestId}/approve`, {
        method: "PATCH",
      });
      await loadAdminData();
      setStatus("Skill request approved! Category added to provider's verified profile.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not approve skill request.");
    }
  };

  const openRejectSkillModal = (sr: SkillRequest) => {
    setRejectingSkillRequest(sr);
    setSkillRejectionReasonText("");
  };

  const handleConfirmSkillRejection = async () => {
    if (!rejectingSkillRequest) return;
    const reason = skillRejectionReasonText.trim();
    if (!reason) {
      setStatus("Please specify a reason for rejection.");
      return;
    }
    setIsSubmittingSkillRejection(true);
    try {
      await apiRequest<SkillRequest>(`/admin/skill-requests/${rejectingSkillRequest.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejection_reason: reason }),
      });
      setRejectingSkillRequest(null);
      setSkillRejectionReasonText("");
      await loadAdminData();
      setStatus(`Skill request for ${rejectingSkillRequest.provider_name} rejected.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not reject skill request.");
    } finally {
      setIsSubmittingSkillRejection(false);
    }
  };

  const viewAdhaarDoc = async (providerId: string) => {
    try {
      const token = localStorage.getItem("ghartak_token");
      const res = await fetch(`${backendBaseUrl}/api/v1/providers/${providerId}/adhaar`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Unable to view Aadhaar document. Not authorized or document not found.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error opening Aadhaar document");
    }
  };

  const viewBankProofDoc = async (providerId: string) => {
    try {
      const token = localStorage.getItem("ghartak_token");
      const res = await fetch(`${backendBaseUrl}/api/v1/providers/${providerId}/bank-proof`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Unable to view Bank proof document. Not authorized or document not found.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error opening Bank proof document");
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const assignProvider = async (bookingId: string) => {
    const providerId = selectedProviderByBooking[bookingId];
    if (!providerId) return;
    setStatus("");

    try {
      const updated = await apiRequest<Booking>(`/admin/bookings/${bookingId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ provider_id: providerId }),
      });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      setSelectedProviderByBooking((prev) => ({
        ...prev,
        [bookingId]: "",
        [`reassign_${bookingId}`]: "",
      }));
      await loadAdminData();
      setStatus(`Provider ${updated.provider_name || "partner"} successfully assigned to booking #${bookingId.slice(0, 8)}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not assign provider.");
    }
  };

  const pendingProviders = providers.filter((p) => p.verification_status === "PENDING_VERIFICATION");
  const filteredBookings = bookings.filter((b) =>
    bookingStatusFilter === "ALL" ? true : b.status === bookingStatusFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-brand-navy via-slate-900 to-brand-navy-dark rounded-3xl p-6 sm:p-8 text-white shadow-floating mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase text-brand-orange tracking-wider mb-1">
            Platform Operator Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Ghar-Tak Admin Control Panel</h1>
          <p className="text-xs text-slate-300 font-medium">
            Manage Patna service categories, provider approvals, skill verification, and system-wide bookings.
          </p>
        </div>

        <button
          onClick={() => void loadAdminData()}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all shrink-0 border border-white/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 2-Column Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { key: "overview", label: "Platform Overview", icon: BarChart3, badge: summary?.total_bookings },
            { key: "categories", label: "Category Management", icon: FolderPlus, badge: categories.length },
            {
              key: "providers",
              label: "Service Partner & Skill Verification",
              icon: ShieldCheck,
              badge: pendingProviders.length + skillRequests.length,
            },
            { key: "bookings", label: "System Bookings", icon: CalendarClock, badge: bookings.length },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as AdminTabKey)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-xs font-extrabold transition-all text-left ${
                  isActive
                    ? "bg-brand-navy text-white shadow-md"
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComp className={`w-4 h-4 ${isActive ? "text-brand-orange" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-3">
          {/* TAB 1: OVERVIEW & METRICS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Total Customers</div>
                  <div className="text-2xl font-black text-brand-navy mt-1">{summary?.total_customers ?? 0}</div>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Active Providers</div>
                  <div className="text-2xl font-black text-brand-navy mt-1">{summary?.verified_providers ?? 0}</div>
                  {pendingProviders.length > 0 && (
                    <div className="text-[10px] text-brand-orange font-extrabold mt-1">
                      {pendingProviders.length} pending review
                    </div>
                  )}
                </div>
                <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Open Bookings</div>
                  <div className="text-2xl font-black text-brand-navy mt-1">{summary?.open_bookings ?? 0}</div>
                </div>
                <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-card">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Completed Jobs</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">{summary?.completed_bookings ?? 0}</div>
                </div>
              </div>

              {/* Quick Action Overview */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-card space-y-4">
                <h3 className="text-base font-black text-brand-navy">Patna Marketplace Status Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Default City Scope</span>
                    <span className="text-brand-navy font-extrabold text-sm block">Patna, Bihar</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Service Categories</span>
                    <span className="text-brand-navy font-extrabold text-sm block">{categories.length} Categories Live</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORY MANAGEMENT */}
          {activeTab === "categories" && (
            <div className="space-y-6">
              <form onSubmit={createCategory} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
                <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-brand-orange" />
                  <span>Add New Service Category</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-brand-navy">Category Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Electrician, Carpenter"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-brand-navy">Price Label / Rate Card</label>
                    <input
                      type="text"
                      placeholder="e.g. Starts at ₹199"
                      value={priceLabel}
                      onChange={(e) => setPriceLabel(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-brand-navy">Description</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Short category description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all"
                >
                  Create Category
                </button>
              </form>

              {/* Active Categories List */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
                <h3 className="text-base font-black text-brand-navy">Live Service Categories ({categories.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((c) => (
                    <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="font-extrabold text-xs text-brand-navy">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">{c.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROVIDER VERIFICATION & SKILL REQUEST QUEUE */}
          {activeTab === "providers" && (
            <div className="space-y-6">
              {/* SECTION A: PENDING SKILL ADDITION REQUESTS */}
              {skillRequests.length > 0 && (
                <div className="bg-white rounded-3xl border border-orange-200 p-6 shadow-card space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-orange" />
                        <span>Pending Skill Addition Requests ({skillRequests.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Providers requesting new verified trade categories with submitted proof of work
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-orange-100 text-brand-orange rounded-full text-xs font-black">
                      Action Required
                    </span>
                  </div>

                  <div className="space-y-3">
                    {skillRequests.map((sr) => (
                      <div
                        key={sr.id}
                        className="p-5 bg-orange-50/50 rounded-2xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-brand-navy">{sr.provider_name}</span>
                            <span className="px-2.5 py-0.5 bg-brand-orange text-white text-[10px] font-black rounded-full uppercase">
                              Wants: {sr.category_name}
                            </span>
                          </div>
                          {sr.notes && <div className="text-xs text-slate-600 font-semibold">"{sr.notes}"</div>}
                          <div className="text-[11px] text-slate-400 font-semibold">
                            Submitted: {new Date(sr.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {sr.proof_url && (
                            <a
                              href={`${backendBaseUrl}${sr.proof_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-brand-navy shadow-sm transition-all"
                            >
                              <FileText className="w-4 h-4 text-brand-orange" />
                              <span>View Proof Document</span>
                            </a>
                          )}
                          <button
                            onClick={() => approveSkillRequest(sr.id)}
                            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Approve Skill</span>
                          </button>
                          <button
                            onClick={() => openRejectSkillModal(sr)}
                            className="flex items-center gap-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION B: MAIN PROVIDER VERIFICATION LIST */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-brand-orange" />
                      <span>Provider Approvals & Profile Status</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Review technician applications in Patna</p>
                  </div>
                  <span className="px-3 py-1 bg-orange-50 text-brand-orange rounded-full text-xs font-extrabold">
                    {pendingProviders.length} Pending Approval
                  </span>
                </div>

                <div className="space-y-4">
                  {providers.length === 0 && (
                    <div className="py-8 text-center text-xs font-semibold text-slate-400">No registered providers yet.</div>
                  )}
                  {providers.map((p) => {
                    const missingCategories = !p.categories || p.categories.length === 0;
                    const missingAadhaar = !p.adhaar_card_url;
                    const canApprove = !missingCategories && !missingAadhaar;
                    const isAccountRevealed = !!revealedBankAccounts[p.id];
                    const hasBankDetails = !!(p.bank_account_number || p.bank_ifsc || p.bank_account_holder);

                    return (
                      <div
                        key={p.id}
                        className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
                      >
                        {/* Top Summary Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-base text-brand-navy">{p.name}</span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  p.verification_status === "VERIFIED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : p.verification_status === "REJECTED"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {p.verification_status.replace("_", " ")}
                              </span>
                              {p.has_tools && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 flex items-center gap-1">
                                  <Wrench className="w-3 h-3" />
                                  <span>Owns Tools</span>
                                </span>
                              )}
                              {p.phone && (
                                <span className="text-xs text-slate-500 font-semibold">
                                  📞 {p.phone}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-semibold mt-1">
                              Experience: {p.experience_years} years • Patna Areas:{" "}
                              {p.localities?.length ? p.localities.join(", ") : "All Patna"}
                            </div>
                            {p.bio && (
                              <div className="text-[11px] text-slate-600 italic mt-1 bg-white/60 p-2 rounded-xl border border-slate-200">
                                "{p.bio}"
                              </div>
                            )}
                          </div>

                          {/* Action Buttons for Pending or Verified */}
                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            {p.verification_status === "PENDING_VERIFICATION" && (
                              <>
                                <button
                                  type="button"
                                  disabled={!canApprove}
                                  onClick={() => verifyProvider(p.id, "approve")}
                                  title={
                                    !canApprove
                                      ? missingCategories && missingAadhaar
                                        ? "Cannot approve: Missing trade categories & Aadhaar document"
                                        : missingCategories
                                        ? "Cannot approve: No trade categories selected"
                                        : "Cannot approve: Aadhaar document not uploaded"
                                      : "Approve Partner"
                                  }
                                  className={`flex items-center gap-1.5 px-4 py-2.5 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all ${
                                    canApprove
                                      ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                                      : "bg-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Approve Partner</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openRejectProviderModal(p)}
                                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {p.verification_status === "VERIFIED" && (
                              <button
                                type="button"
                                onClick={() => verifyProvider(p.id, "disable")}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-extrabold transition-all"
                              >
                                <span>Disable Account</span>
                              </button>
                            )}

                            {p.verification_status === "REJECTED" && (
                              <div className="text-[11px] font-bold text-rose-600">
                                Rejection reason: {p.rejection_reason || "None"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Trade Categories Pills */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">Trade Categories:</span>
                          {p.categories?.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {p.categories.map((c) => (
                                <span
                                  key={c}
                                  className="px-2.5 py-0.5 bg-white border border-slate-200 text-brand-navy rounded-lg text-xs font-bold shadow-2xs"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold">
                              No categories selected (Needs update)
                            </span>
                          )}
                        </div>

                        {/* Financial Bank & KYC Verification Details Card */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-brand-orange" />
                              <span className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                                Bank Branch & Payout KYC Details
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Admin Verification View (Unmasked)
                            </span>
                          </div>

                          {hasBankDetails ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Account Holder */}
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Account Holder</div>
                                <div className="font-extrabold text-brand-navy">
                                  {p.bank_account_holder || p.name}
                                </div>
                              </div>

                              {/* Account Number with Show/Hide & Copy */}
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                  Bank Account Number
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-brand-navy tracking-wider text-sm">
                                    {isAccountRevealed
                                      ? p.bank_account_number
                                      : p.bank_account_number
                                      ? `•••• •••• ${p.bank_account_number.slice(-4)}`
                                      : "Not Provided"}
                                  </span>
                                  {p.bank_account_number && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setRevealedBankAccounts((prev) => ({
                                            ...prev,
                                            [p.id]: !prev[p.id],
                                          }))
                                        }
                                        title={isAccountRevealed ? "Mask Account Number" : "Show Full Account Number"}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                      >
                                        {isAccountRevealed ? (
                                          <EyeOff className="w-3.5 h-3.5" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => copyText(p.bank_account_number || "", `acc_${p.id}`)}
                                        title="Copy Account Number"
                                        className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                      >
                                        {copiedKey === `acc_${p.id}` ? (
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* IFSC & UPI */}
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">
                                  IFSC & UPI
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-brand-navy uppercase">
                                    {p.bank_ifsc || "Not Provided"}
                                  </span>
                                  {p.bank_ifsc && (
                                    <button
                                      type="button"
                                      onClick={() => copyText(p.bank_ifsc || "", `ifsc_${p.id}`)}
                                      title="Copy IFSC"
                                      className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                    >
                                      {copiedKey === `ifsc_${p.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}
                                  {p.payout_upi_id && (
                                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      UPI: {p.payout_upi_id}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 font-semibold">
                              No bank details provided for this partner account.
                            </div>
                          )}

                          {/* Verification Documents Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                            {p.adhaar_card_url ? (
                              <button
                                type="button"
                                onClick={() => viewAdhaarDoc(p.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-brand-orange border border-brand-orange/30 rounded-xl text-xs font-extrabold shadow-2xs transition-all"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Aadhaar Document (Private KYC)</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>No Aadhaar Document Uploaded</span>
                              </span>
                            )}

                            {p.bank_proof_url ? (
                              <button
                                type="button"
                                onClick={() => viewBankProofDoc(p.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-extrabold shadow-2xs transition-all"
                              >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>View Passbook / Cheque Copy</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold px-2 py-1">
                                No Cheque/Passbook attached
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Guardrail Warning Banner when pending & cannot approve */}
                        {p.verification_status === "PENDING_VERIFICATION" && !canApprove && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              {missingCategories && missingAadhaar
                                ? "Approval Blocked: Partner has not selected trade categories and has not uploaded Aadhaar card."
                                : missingCategories
                                ? "Approval Blocked: Partner has not selected any trade categories."
                                : "Approval Blocked: Mandatory Aadhaar card document is missing."}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-brand-orange" />
                  <span>All System Bookings ({bookings.length})</span>
                </h3>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value as any)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-brand-navy"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="REQUESTED">Requested / Pending</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="ON_THE_WAY">On The Way</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {status && (
                <div className="p-3.5 bg-orange-50 border border-brand-orange/30 rounded-2xl text-xs font-bold text-brand-navy flex items-center justify-between shadow-sm">
                  <span>{status}</span>
                  <button
                    onClick={() => setStatus("")}
                    className="text-slate-400 hover:text-slate-600 font-black ml-2 text-sm leading-none"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {filteredBookings.length === 0 && (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">No bookings match filter.</div>
                )}
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-xs text-brand-navy">{b.category_name}</span>
                        <span className="px-2.5 py-0.5 bg-brand-navy text-white text-[10px] font-extrabold rounded-full">
                          {b.status}
                        </span>
                        {b.otp && (
                          <span className="px-2 py-0.5 bg-orange-100 text-brand-orange text-[10px] font-mono font-black rounded-md">
                            OTP: {b.otp}
                          </span>
                        )}
                        {b.items && b.items.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            ({b.items.length} items • ₹{b.total_amount || b.final_amount || 0})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        Customer: {b.customer_name} • Address: {[b.house_number, b.building_name, b.locality, b.landmark ? `Near ${b.landmark}` : null, b.pincode].filter(Boolean).join(", ") || b.address || b.locality}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Assigned: {b.provider_name || "Unassigned"}
                      </div>
                    </div>

                    {b.provider_id && (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Assigned: {b.provider_name}</span>
                        </span>
                        {b.status === "REQUESTED" && (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black animate-pulse">
                            Awaiting Partner Acceptance
                          </span>
                        )}
                        {(b.status === "REQUESTED" || b.status === "REJECTED") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProviderByBooking((prev) => ({
                                ...prev,
                                [`reassign_${b.id}`]: prev[`reassign_${b.id}`] ? "" : "true",
                              }));
                            }}
                            className="text-[11px] font-bold text-slate-500 hover:text-brand-orange underline ml-1"
                          >
                            {selectedProviderByBooking[`reassign_${b.id}`] ? "Cancel" : "Reassign"}
                          </button>
                        )}
                      </div>
                    )}

                    {(!b.provider_id || selectedProviderByBooking[`reassign_${b.id}`] === "true") &&
                      (b.status === "REQUESTED" || b.status === "REJECTED") &&
                      (() => {
                        const eligibleProviders = providers.filter(
                          (p) =>
                            p.verification_status === "VERIFIED" &&
                            p.categories &&
                            p.categories.some(
                              (cat) => cat.toLowerCase() === (b.category_name || "").toLowerCase()
                            )
                        );

                        return (
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={selectedProviderByBooking[b.id] || ""}
                              onChange={(e) =>
                                setSelectedProviderByBooking((prev) => ({
                                  ...prev,
                                  [b.id]: e.target.value,
                                }))
                              }
                              className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-brand-ink max-w-[180px]"
                            >
                              <option value="">
                                {eligibleProviders.length > 0
                                  ? "Select Patna Pro"
                                  : `No verified ${b.category_name || "category"} pros`}
                              </option>
                              {eligibleProviders.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={!selectedProviderByBooking[b.id]}
                              onClick={() => assignProvider(b.id)}
                              className="px-3 py-2 bg-brand-orange text-white rounded-xl text-xs font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {b.provider_id ? "Confirm Reassign" : "Assign"}
                            </button>
                          </div>
                        );
                      })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {status && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-xs font-bold text-brand-navy">
          {status}
        </div>
      )}

      {/* Provider Rejection Modal */}
      {rejectingProvider && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-brand-navy">Reject Partner Application</h3>
                  <p className="text-xs text-slate-500 font-semibold">{rejectingProvider.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingProvider(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                Quick Preset Reasons (Click to apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PROVIDER_REJECTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReasonText(preset)}
                    className="text-left text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-orange hover:bg-orange-50/50 text-slate-700 transition-all cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-brand-navy uppercase tracking-wider block">
                Rejection Reason (Visible to Partner on Portal)
              </label>
              <textarea
                value={rejectionReasonText}
                onChange={(e) => setRejectionReasonText(e.target.value)}
                rows={3}
                placeholder="Specify the reason clearly so the partner can correct details and re-apply..."
                className="w-full p-3 border border-slate-200 rounded-2xl text-xs text-brand-ink focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              />
              <p className="text-[11px] text-slate-400 font-medium">
                The partner will see this reason in their portal dashboard and will have the opportunity to update their documents or details to re-apply.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingProvider(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReasonText.trim() || isSubmittingRejection}
                onClick={handleConfirmProviderRejection}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                {isSubmittingRejection ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skill Request Rejection Modal */}
      {rejectingSkillRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-brand-navy">Reject Skill Request</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    {rejectingSkillRequest.provider_name} • {rejectingSkillRequest.category_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingSkillRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                Quick Preset Reasons
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_REJECTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSkillRejectionReasonText(preset)}
                    className="text-left text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-orange hover:bg-orange-50/50 text-slate-700 transition-all cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-brand-navy uppercase tracking-wider block">
                Rejection Reason
              </label>
              <textarea
                value={skillRejectionReasonText}
                onChange={(e) => setSkillRejectionReasonText(e.target.value)}
                rows={3}
                placeholder="Specify the reason why this skill qualification proof cannot be approved..."
                className="w-full p-3 border border-slate-200 rounded-2xl text-xs text-brand-ink focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingSkillRequest(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!skillRejectionReasonText.trim() || isSubmittingSkillRejection}
                onClick={handleConfirmSkillRejection}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                {isSubmittingSkillRejection ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
