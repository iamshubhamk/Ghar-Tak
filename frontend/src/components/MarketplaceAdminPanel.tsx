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
  RefreshCw,
  Search,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { AdminDashboardSummary } from "../types/admin";
import { Booking, BookingStatus, Review } from "../types/booking";
import { Category, ProviderProfile } from "../types/marketplace";

type AdminTabKey = "overview" | "categories" | "providers" | "bookings";

export function MarketplaceAdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");

  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedProviderByBooking, setSelectedProviderByBooking] = useState<Record<string, string>>({});
  const [bookingStatusFilter, setBookingStatusFilter] = useState<BookingStatus | "ALL">("ALL");

  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [status, setStatus] = useState("");

  const loadAdminData = async () => {
    try {
      const [categoryResponse, providerResponse, bookingResponse, summaryResponse, reviewResponse] =
        await Promise.all([
          apiRequest<Category[]>("/admin/categories"),
          apiRequest<ProviderProfile[]>("/admin/providers"),
          apiRequest<Booking[]>("/admin/bookings"),
          apiRequest<AdminDashboardSummary>("/admin/summary"),
          apiRequest<Review[]>("/admin/reviews"),
        ]);
      setCategories(categoryResponse);
      setProviders(providerResponse);
      setBookings(bookingResponse);
      setSummary(summaryResponse);
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

  const verifyProvider = async (providerId: string, action: "approve" | "reject") => {
    setStatus("");
    let rejection_reason: string | undefined = undefined;
    if (action === "reject") {
      const reason = window.prompt("Reason for rejection:");
      if (reason === null) return;
      rejection_reason = reason || "No reason provided";
    }

    try {
      await apiRequest<ProviderProfile>(`/admin/providers/${providerId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify(action === "reject" ? { rejection_reason } : {}),
      });
      await loadAdminData();
      setStatus(`Provider ${action}d successfully.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Could not ${action} provider.`);
    }
  };

  const assignProvider = async (bookingId: string) => {
    const providerId = selectedProviderByBooking[bookingId];
    if (!providerId) return;
    setStatus("");

    try {
      await apiRequest<Booking>(`/admin/bookings/${bookingId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ provider_id: providerId }),
      });
      await loadAdminData();
      setStatus("Provider assigned to booking.");
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
            Manage Patna service categories, provider approvals, and system-wide bookings.
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
            { key: "providers", label: "Provider Verification", icon: ShieldCheck, badge: pendingProviders.length },
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

          {/* TAB 3: PROVIDER VERIFICATION */}
          {activeTab === "providers" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-brand-orange" />
                    <span>Provider Approvals & Verification</span>
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
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-brand-navy">{p.name}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.verification_status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-700"
                              : p.verification_status === "REJECTED"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {p.verification_status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        Experience: {p.experience_years} years • Categories: {p.categories.join(", ") || "General"}
                      </div>
                      {p.bio && <div className="text-[11px] text-slate-400 mt-0.5">"{p.bio}"</div>}
                    </div>

                    {p.verification_status === "PENDING_VERIFICATION" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => verifyProvider(p.id, "approve")}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => verifyProvider(p.id, "reject")}
                          className="flex items-center gap-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
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
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

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
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-brand-navy">{b.category_name}</span>
                        <span className="px-2.5 py-0.5 bg-brand-navy text-white text-[10px] font-extrabold rounded-full">
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-semibold mt-1">
                        Customer: {b.customer_name} • Locality: {b.locality}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Assigned: {b.provider_name || "Unassigned"}
                      </div>
                    </div>

                    {!b.provider_name && b.status === "REQUESTED" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={selectedProviderByBooking[b.id] || ""}
                          onChange={(e) =>
                            setSelectedProviderByBooking((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }
                          className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-brand-ink"
                        >
                          <option value="">Select Patna Pro</option>
                          {providers
                            .filter((p) => p.verification_status === "VERIFIED")
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => assignProvider(b.id)}
                          className="px-3 py-2 bg-brand-orange text-white rounded-xl text-xs font-extrabold"
                        >
                          Assign
                        </button>
                      </div>
                    )}
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
    </div>
  );
}
