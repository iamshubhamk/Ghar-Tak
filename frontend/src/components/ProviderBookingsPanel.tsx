import React, { FormEvent, useEffect, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Banknote,
  CalendarClock,
  UserCheck,
  PlayCircle,
  Building,
  Plus,
  FileText,
  Upload,
  Sparkles,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { apiBaseUrl, backendBaseUrl } from "../lib/config";
import { Booking } from "../types/booking";
import { Category, ProviderProfile, SkillRequest } from "../types/marketplace";

type ProviderTabKey = "jobs" | "profile" | "earnings";

export function ProviderBookingsPanel() {
  const [activeTab, setActiveTab] = useState<ProviderTabKey>("jobs");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [status, setStatus] = useState("");
  const [otpInput, setOtpInput] = useState<Record<string, string>>({});

  // Skill Request States
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillRequests, setSkillRequests] = useState<SkillRequest[]>([]);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [skillNotes, setSkillNotes] = useState("");

  const loadData = async () => {
    try {
      const [providerResponse, categoryResponse, skillRequestResponse] = await Promise.all([
        apiRequest<ProviderProfile>("/provider/me"),
        apiRequest<Category[]>("/categories"),
        apiRequest<SkillRequest[]>("/provider/me/skill-requests").catch(() => []),
      ]);
      setProvider(providerResponse);
      setCategories(categoryResponse);
      setSkillRequests(skillRequestResponse);

      if (categoryResponse.length > 0 && !selectedCategoryName) {
        setSelectedCategoryName(categoryResponse[0].name);
      }

      if (providerResponse.verification_status !== "VERIFIED") {
        setBookings([]);
        setStatus("Your partner profile is currently under review by admin.");
        return;
      }

      const response = await apiRequest<Booking[]>("/provider/bookings");
      setBookings(response);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Provider data unavailable.");
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSkillRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryName || !proofFile) {
      setStatus("Please select a category and upload a proof of work file.");
      return;
    }
    setStatus("");

    const formData = new FormData();
    formData.append("category_name", selectedCategoryName);
    formData.append("proof_file", proofFile);
    if (skillNotes) {
      formData.append("notes", skillNotes);
    }

    try {
      const response = await fetch(`${apiBaseUrl}/provider/me/skill-requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("ghartak_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail?.error?.message || err.detail || "Failed to submit skill request.");
      }

      const newRequest: SkillRequest = await response.json();
      setSkillRequests((prev) => [newRequest, ...prev]);
      setIsSkillModalOpen(false);
      setProofFile(null);
      setSkillNotes("");
      setStatus(`Skill request for ${selectedCategoryName} submitted for Admin review!`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Skill request failed.");
    }
  };

  const updateBookingStatus = async (bookingId: string, action: "accept" | "reject" | "in_progress" | "complete") => {
    setStatus("");
    try {
      const payload: Record<string, any> = {};
      if (action === "in_progress") {
        payload.otp = otpInput[bookingId] || "";
      }

      await apiRequest<Booking>(`/provider/bookings/${bookingId}/${action}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await loadData();
      setStatus(`Job updated successfully (${action.toUpperCase()}).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Could not update job.`);
    }
  };

  const activeJobs = bookings.filter((b) => b.status !== "COMPLETED" && !b.status.startsWith("CANCELLED"));
  const completedJobs = bookings.filter((b) => b.status === "COMPLETED");
  const totalEarnings = completedJobs.reduce((acc, b) => acc + (b.final_amount || 499), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-brand-navy via-slate-900 to-brand-navy-dark rounded-3xl p-6 sm:p-8 text-white shadow-floating mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase text-brand-orange tracking-wider mb-1">
            Service Partner Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Welcome, {provider?.name || "Partner"}</h1>
          <p className="text-xs text-slate-300 font-medium">
            Manage Patna job dispatches, skill additions, and weekly earnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 ${
              provider?.verification_status === "VERIFIED"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{provider?.verification_status || "PENDING"}</span>
          </span>
        </div>
      </div>

      {/* 2-Column Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { key: "jobs", label: "Job Dispatches", icon: Briefcase, badge: activeJobs.length },
            { key: "profile", label: "Partner Profile & Skills", icon: UserCheck, badge: provider?.categories.length },
            { key: "earnings", label: "Earnings & Bank Payout", icon: Banknote, badge: `₹${totalEarnings}` },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ProviderTabKey)}
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
          {/* TAB 1: JOB DISPATCHES */}
          {activeTab === "jobs" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-brand-orange" />
                    <span>Assigned Jobs in Patna</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-400">{bookings.length} total</span>
                </div>

                <div className="space-y-4">
                  {bookings.length === 0 && (
                    <div className="py-12 text-center text-xs font-semibold text-slate-400">
                      No active job dispatches right now.
                    </div>
                  )}

                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                        <div>
                          <div className="font-extrabold text-sm text-brand-navy">{b.category_name}</div>
                          <div className="text-xs text-slate-500 font-semibold mt-0.5">
                            Customer: {b.customer_name} • Phone: {b.customer_phone || "Hidden"}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(b.preferred_datetime).toLocaleString()} • {b.locality}
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize self-start sm:self-auto ${
                            b.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      {/* Action Triggers */}
                      {b.status === "REQUESTED" || b.status === "ACCEPTED" ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => updateBookingStatus(b.id, "accept")}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all"
                          >
                            Accept Job
                          </button>
                          <button
                            onClick={() => updateBookingStatus(b.id, "reject")}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      ) : null}

                      {b.status === "ACCEPTED" && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Enter 4-digit Customer OTP"
                            value={otpInput[b.id] || ""}
                            onChange={(e) =>
                              setOtpInput((prev) => ({ ...prev, [b.id]: e.target.value }))
                            }
                            className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-brand-ink"
                          />
                          <button
                            onClick={() => updateBookingStatus(b.id, "in_progress")}
                            className="px-4 py-2 bg-brand-orange text-white rounded-xl text-xs font-extrabold"
                          >
                            Verify OTP & Start Job
                          </button>
                        </div>
                      )}

                      {b.status === "IN_PROGRESS" && (
                        <div className="pt-1">
                          <button
                            onClick={() => updateBookingStatus(b.id, "complete")}
                            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm"
                          >
                            Mark Job Completed
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTNER PROFILE & SKILL CREDENTIALS */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-brand-orange" />
                      <span>Partner Profile & Skill Credentials</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Manage your active skills, experience, and submit proof of work for new categories.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsSkillModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Request New Skill Category</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Partner Name</span>
                    <span className="text-brand-navy font-extrabold text-sm block">{provider?.name}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification Status</span>
                    <span className="text-emerald-600 font-extrabold text-sm block flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> {provider?.verification_status}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Experience</span>
                    <span className="text-brand-navy font-extrabold text-sm block">{provider?.experience_years} Years</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Verified Skills</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {provider?.categories && provider.categories.length > 0 ? (
                        provider.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs">No skills assigned yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skill Addition Requests History */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-black uppercase text-brand-navy tracking-wider">
                    Skill Addition Requests & Verification Status ({skillRequests.length})
                  </h4>

                  <div className="space-y-2">
                    {skillRequests.length === 0 && (
                      <div className="py-6 text-center text-xs font-semibold text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                        No additional skill requests submitted yet. Click "Request New Skill Category" above to add new trade skills (e.g. Carpenter, Plumber).
                      </div>
                    )}

                    {skillRequests.map((sr) => (
                      <div
                        key={sr.id}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-brand-navy">{sr.category_name}</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                sr.status === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : sr.status === "REJECTED"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {sr.status}
                            </span>
                          </div>
                          {sr.notes && <div className="text-xs text-slate-500 font-medium mt-1">"{sr.notes}"</div>}
                          {sr.rejection_reason && (
                            <div className="text-xs text-rose-600 font-bold mt-1">
                              Rejection Reason: {sr.rejection_reason}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 mt-1">
                            Submitted: {new Date(sr.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        {sr.proof_url && (
                          <a
                            href={`${backendBaseUrl}${sr.proof_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-brand-navy shadow-sm transition-all self-start sm:self-auto shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5 text-brand-orange" />
                            <span>View Submitted Proof</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal for Requesting New Skill */}
              {isSkillModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
                  <form
                    onSubmit={handleSkillRequestSubmit}
                    className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-floating space-y-4 border border-slate-200"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h4 className="text-lg font-black text-brand-navy">Request New Skill Category</h4>
                      <button
                        type="button"
                        onClick={() => setIsSkillModalOpen(false)}
                        className="p-1 text-slate-400 hover:text-brand-navy rounded-full"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">Skill Category</label>
                      <select
                        value={selectedCategoryName}
                        onChange={(e) => setSelectedCategoryName(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-brand-ink"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">
                        Proof of Work / Certification (Photo or PDF)
                      </label>
                      <input
                        type="file"
                        required
                        accept="image/*,.pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-orange-50 file:text-brand-orange"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Upload photos of your past jobs (e.g. carpentry/plumbing work) or trade training certificate.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">Experience / Work Summary Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Describe your work experience in this skill (years, past projects, tools)..."
                        value={skillNotes}
                        onChange={(e) => setSkillNotes(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsSkillModalOpen(false)}
                        className="w-1/2 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-extrabold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all"
                      >
                        Submit for Verification
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EARNINGS & BANK PAYOUT */}
          {activeTab === "earnings" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <div className="p-6 bg-gradient-to-br from-brand-navy to-slate-900 rounded-3xl text-white flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-bold text-orange-200">Total Completed Job Earnings</div>
                  <div className="text-3xl font-black mt-1">₹{totalEarnings}</div>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Banknote className="w-8 h-8 text-brand-orange" />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                  Completed Job Payout Log
                </h4>
                <div className="space-y-2">
                  {completedJobs.length === 0 && (
                    <div className="py-6 text-center text-xs font-semibold text-slate-400">
                      No completed payouts recorded yet.
                    </div>
                  )}
                  {completedJobs.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-extrabold text-xs text-brand-navy">{b.category_name}</div>
                        <div className="text-[11px] text-slate-400">{b.locality}</div>
                      </div>
                      <div className="text-emerald-600 font-black text-sm">+₹{b.final_amount || 499}</div>
                    </div>
                  ))}
                </div>
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
