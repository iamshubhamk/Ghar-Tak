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
  AlertTriangle,
  XCircle,
  RefreshCw,
  Building2,
  Wrench,
  Check,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { apiBaseUrl, backendBaseUrl } from "../lib/config";
import { Booking } from "../types/booking";
import { Category, ProviderProfile, SkillRequest } from "../types/marketplace";

type ProviderTabKey = "jobs" | "profile" | "earnings";

const PATNA_LOCALITIES = [
  "Boring Road",
  "Kankarbagh",
  "Bailey Road",
  "Patliputra",
  "Danapur",
  "Rajendra Nagar",
  "Fraser Road",
  "Anisabad",
  "Ashok Rajpath",
  "Digha",
];

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

  // Application Resubmission States (After Rejection)
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitCategories, setResubmitCategories] = useState<string[]>([]);
  const [resubmitLocalities, setResubmitLocalities] = useState<string[]>([]);
  const [resubmitHolder, setResubmitHolder] = useState("");
  const [resubmitAccount, setResubmitAccount] = useState("");
  const [resubmitIfsc, setResubmitIfsc] = useState("");
  const [resubmitUpi, setResubmitUpi] = useState("");
  const [resubmitExp, setResubmitExp] = useState(1);
  const [resubmitHasTools, setResubmitHasTools] = useState(false);
  const [resubmitBio, setResubmitBio] = useState("");
  const [resubmitAdhaarFile, setResubmitAdhaarFile] = useState<File | null>(null);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState("");

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
        setStatus("");
        return;
      }

      const response = await apiRequest<Booking[]>("/provider/bookings");
      setBookings(response);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Provider data unavailable.");
    }
  };

  const openResubmitModal = () => {
    if (!provider) return;
    setResubmitCategories(provider.categories || []);
    setResubmitLocalities(provider.localities || []);
    setResubmitHolder(provider.bank_account_holder || provider.name || "");
    setResubmitAccount(provider.bank_account_number || "");
    setResubmitIfsc(provider.bank_ifsc || "");
    setResubmitUpi(provider.payout_upi_id || "");
    setResubmitExp(provider.experience_years || 1);
    setResubmitHasTools(provider.has_tools || false);
    setResubmitBio(provider.bio || "");
    setResubmitAdhaarFile(null);
    setResubmitError("");
    setIsResubmitModalOpen(true);
  };

  const toggleResubmitCategory = (catName: string) => {
    setResubmitCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const toggleResubmitLocality = (loc: string) => {
    setResubmitLocalities((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleResubmitApplication = async (e: FormEvent) => {
    e.preventDefault();
    setResubmitError("");

    if (resubmitCategories.length === 0) {
      setResubmitError("Please select at least one trade category.");
      return;
    }
    if (resubmitLocalities.length === 0) {
      setResubmitError("Please select at least one Patna locality you can serve.");
      return;
    }
    if (!resubmitAccount.trim() || !resubmitIfsc.trim()) {
      setResubmitError("Bank account number and IFSC code are required.");
      return;
    }

    setIsResubmitting(true);
    try {
      const formData = new FormData();
      if (resubmitAdhaarFile) {
        formData.append("adhaar_card", resubmitAdhaarFile);
      }
      formData.append("categories", JSON.stringify(resubmitCategories));
      formData.append("localities", JSON.stringify(resubmitLocalities));
      formData.append("experience_years", String(resubmitExp));
      formData.append("has_tools", String(resubmitHasTools));
      formData.append("bank_account_holder", resubmitHolder);
      formData.append("bank_account_number", resubmitAccount);
      formData.append("bank_ifsc", resubmitIfsc);
      if (resubmitUpi) {
        formData.append("payout_upi_id", resubmitUpi);
      }
      if (resubmitBio) {
        formData.append("bio", resubmitBio);
      }

      const res = await fetch(`${apiBaseUrl}/provider/me/resubmit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("ghartak_token")}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail?.error?.message || data.detail || "Failed to resubmit application.");
      }

      setIsResubmitModalOpen(false);
      await loadData();
      setStatus("Application successfully updated and re-submitted for Admin verification.");
    } catch (err) {
      setResubmitError(err instanceof Error ? err.message : "Could not resubmit application.");
    } finally {
      setIsResubmitting(false);
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

  const updateBookingStatus = async (
    bookingId: string,
    action: "accept" | "reject" | "on_the_way" | "in_progress" | "complete"
  ) => {
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
      setStatus(`Job updated successfully (${action.toUpperCase().replace("_", " ")}).`);
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
              {/* Application Rejected / Needs Revision Dedicated Portal Banner */}
              {provider?.verification_status === "REJECTED" && (
                <div className="bg-white rounded-3xl border-2 border-rose-200 p-6 sm:p-8 shadow-card space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100 pb-5">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider mb-1">
                          Action Required • Application Not Approved
                        </div>
                        <h3 className="text-xl font-black text-brand-navy">
                          Application Needs Revision
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Admin reviewed your application and requested updates. Please review the reason below, update your details or documents, and re-apply.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={openResubmitModal}
                      className="flex items-center gap-2 px-5 py-3 bg-brand-navy hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-4 h-4 text-brand-orange" />
                      <span>Update Details & Re-apply</span>
                    </button>
                  </div>

                  {/* Prominent Rejection Reason Box */}
                  <div className="p-5 bg-rose-50/80 rounded-2xl border border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Admin Rejection Reason:</span>
                    </div>
                    <div className="text-sm font-bold text-rose-800 bg-white/90 p-4 rounded-xl border border-rose-200">
                      "{provider.rejection_reason || "Document or profile details require review."}"
                    </div>
                    <p className="text-[11px] text-rose-700 font-semibold">
                      Please rectify the issue mentioned above and click "Update Details & Re-apply" to submit your application back to the Admin verification queue.
                    </p>
                  </div>

                  {/* Submitted Details Snapshot */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-brand-navy uppercase tracking-wider">
                        Current Application Snapshot
                      </div>
                      <button
                        type="button"
                        onClick={openResubmitModal}
                        className="text-xs font-bold text-brand-orange hover:underline cursor-pointer"
                      >
                        Edit Details →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Account Holder</div>
                        <div className="font-extrabold text-brand-navy">
                          {provider.bank_account_holder || provider.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Bank Account</div>
                        <div className="font-mono font-extrabold text-brand-navy">
                          {provider.bank_account_number
                            ? `•••• •••• ${provider.bank_account_number.slice(-4)}`
                            : "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">IFSC Code</div>
                        <div className="font-mono font-extrabold text-brand-navy">
                          {provider.bank_ifsc || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Trade Skill(s)</div>
                        <div className="font-extrabold text-brand-navy">
                          {provider.categories?.join(", ") || "None selected"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Operating Localities</div>
                        <div className="font-extrabold text-brand-navy">
                          {provider.localities?.join(", ") || "None selected"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Aadhaar Card Document</div>
                        <div className="font-extrabold text-slate-700">
                          {provider.adhaar_card_url ? "Uploaded on file (Can replace)" : "Missing / Not uploaded"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Support Helpline Box */}
                  <div className="p-4 bg-orange-50 rounded-2xl border border-brand-orange/30 text-xs text-brand-navy flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold">Need assistance with your re-application?</div>
                      <div className="text-slate-600 text-[11px] font-medium">
                        Contact our Patna Service Partner Onboarding Desk on WhatsApp.
                      </div>
                    </div>
                    <a
                      href="https://wa.me/919123456789"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-sm transition-all"
                    >
                      WhatsApp Support Desk
                    </a>
                  </div>
                </div>
              )}

              {/* Application Under Review Dedicated Portal Banner */}
              {provider?.verification_status === "PENDING_VERIFICATION" && (
                <div className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-8 shadow-card space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-5">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-1">
                          Application Under Review
                        </div>
                        <h3 className="text-xl font-black text-brand-navy">
                          Verification in Progress
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Your application was received. GharTak admin is verifying your Aadhaar KYC and bank branch records.
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-extrabold text-amber-800 shrink-0">
                      Estimated: 24–48 Hours
                    </div>
                  </div>

                  {/* 3-Step Verification Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800">1. Registration</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        Profile & initial details submitted.
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1 ring-2 ring-amber-300">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-800">2. Bank & Aadhaar KYC</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="text-[11px] text-amber-700 font-semibold">
                        Admin cross-verifying branch & identity.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 opacity-75">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-500">3. Patna Go-Live</span>
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Receive direct customer job dispatches.
                      </p>
                    </div>
                  </div>

                  {/* Submitted KYC Summary */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="text-xs font-black text-brand-navy uppercase tracking-wider">
                      Submitted KYC & Payout Information
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Account Holder</div>
                        <div className="font-extrabold text-brand-navy">
                          {provider.bank_account_holder || provider.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Bank Account</div>
                        <div className="font-mono font-extrabold text-brand-navy">
                          {provider.bank_account_number
                            ? `•••• •••• ${provider.bank_account_number.slice(-4)}`
                            : "Registered"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">IFSC Code</div>
                        <div className="font-mono font-extrabold text-brand-navy">
                          {provider.bank_ifsc || "Provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Trade Skill(s)</div>
                        <div className="font-extrabold text-brand-navy">
                          {provider.categories?.join(", ") || "General"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Operating Localities</div>
                        <div className="font-extrabold text-brand-navy">
                          {provider.localities?.join(", ") || "All Patna"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Aadhaar Card Document</div>
                        <div className="font-extrabold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Uploaded (Private)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Support Helpline Box */}
                  <div className="p-4 bg-orange-50 rounded-2xl border border-brand-orange/30 text-xs text-brand-navy flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold">Need expedite verification or have questions?</div>
                      <div className="text-slate-600 text-[11px] font-medium">
                        Contact our Patna Service Partner Onboarding Desk directly.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href="https://wa.me/919123456789"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-sm transition-all"
                      >
                        WhatsApp Support
                      </a>
                      <a
                        href="mailto:partner@ghartak.in"
                        className="px-3.5 py-2 bg-brand-navy hover:bg-slate-800 text-white rounded-xl font-extrabold text-xs shadow-sm transition-all"
                      >
                        Email Desk
                      </a>
                    </div>
                  </div>
                </div>
              )}

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

                      {/* Customer Address & Navigation Link */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 text-xs">
                        <div className="text-slate-600 font-semibold truncate max-w-md">
                          📍 {b.address || b.locality || "Patna"}
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            b.address || b.locality || "Patna"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-lg inline-flex items-center gap-1 transition-all"
                        >
                          <span>🗺️ Open in Google Maps</span>
                        </a>
                      </div>

                      {/* Action Triggers */}
                      {b.status === "REQUESTED" ? (
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
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => updateBookingStatus(b.id, "on_the_way")}
                            className="px-4 py-2 bg-brand-navy hover:bg-brand-navy-dark text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                          >
                            🚀 I am On The Way
                          </button>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Or enter Customer OTP"
                              value={otpInput[b.id] || ""}
                              onChange={(e) =>
                                setOtpInput((prev) => ({ ...prev, [b.id]: e.target.value }))
                              }
                              className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-brand-ink w-44"
                            />
                            <button
                              onClick={() => updateBookingStatus(b.id, "in_progress")}
                              className="px-3.5 py-2 bg-brand-orange text-white rounded-xl text-xs font-extrabold"
                            >
                              Verify & Start
                            </button>
                          </div>
                        </div>
                      )}

                      {b.status === "ON_THE_WAY" && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 p-3 bg-amber-50 rounded-xl border border-amber-200">
                          <div className="text-xs font-extrabold text-amber-900">
                            You are en route! Ask customer for 4-digit OTP on arrival:
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="4-digit Customer OTP"
                              value={otpInput[b.id] || ""}
                              onChange={(e) =>
                                setOtpInput((prev) => ({ ...prev, [b.id]: e.target.value }))
                              }
                              className="p-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-brand-ink w-40"
                            />
                            <button
                              onClick={() => updateBookingStatus(b.id, "in_progress")}
                              className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-xs font-extrabold shadow-sm"
                            >
                              Verify OTP & Start Job
                            </button>
                          </div>
                        </div>
                      )}

                      {b.status === "IN_PROGRESS" && (
                        <div className="pt-1 flex items-center gap-3">
                          <button
                            onClick={() => updateBookingStatus(b.id, "complete")}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                          >
                            Mark Job Completed
                          </button>
                        </div>
                      )}

                      {b.status === "COMPLETED" && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                          <div className="text-xs font-bold text-emerald-900">
                            Payment: {b.payment_status === "PAID_CASH" ? "✅ Paid Cash / Settled" : "💰 Pending Collection"} (₹{b.final_amount || b.total_amount || 499})
                          </div>
                          {b.payment_status !== "PAID_CASH" && (
                            <button
                              onClick={async () => {
                                await apiRequest(`/provider/bookings/${b.id}/mark-cash-paid`, { method: "PATCH" });
                                await loadData();
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow-sm"
                            >
                              Confirm Payment Received
                            </button>
                          )}
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
                    <span
                      className={`font-extrabold text-sm flex items-center gap-1.5 ${
                        provider?.verification_status === "VERIFIED"
                          ? "text-emerald-600"
                          : provider?.verification_status === "REJECTED"
                          ? "text-rose-600"
                          : "text-amber-600"
                      }`}
                    >
                      {provider?.verification_status === "VERIFIED" && <CheckCircle2 className="w-4 h-4" />}
                      {provider?.verification_status === "REJECTED" && <XCircle className="w-4 h-4" />}
                      {provider?.verification_status === "PENDING_VERIFICATION" && <Clock className="w-4 h-4" />}
                      <span>{provider?.verification_status?.replace("_", " ")}</span>
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

                {/* Profile Tab Rejection Alert */}
                {provider?.verification_status === "REJECTED" && (
                  <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Application Needs Revision</span>
                      </div>
                      <button
                        type="button"
                        onClick={openResubmitModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Update & Re-apply</span>
                      </button>
                    </div>
                    <div className="text-xs font-semibold text-rose-900 bg-white/80 p-3 rounded-xl border border-rose-200">
                      Reason: {provider.rejection_reason || "Details require review"}
                    </div>
                  </div>
                )}

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

              {/* Registered Payout Bank Account Card */}
              {provider && (provider.bank_account_number || provider.bank_ifsc) && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-brand-orange" />
                      <span className="text-xs font-black text-brand-navy uppercase tracking-wider">
                        Direct Bank Settlement Account
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Verified for Direct Payouts
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Account Holder</div>
                      <div className="font-extrabold text-brand-navy">
                        {provider.bank_account_holder || provider.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Account Number</div>
                      <div className="font-mono font-extrabold text-brand-navy">
                        {provider.bank_account_number
                          ? `•••• •••• ${provider.bank_account_number.slice(-4)}`
                          : "Registered"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</div>
                      <div className="font-mono font-extrabold text-brand-navy">
                        {provider.bank_ifsc || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Update Application & Re-apply Modal */}
      {isResubmitModalOpen && provider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleResubmitApplication}
            className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-brand-navy">Update Application & Re-apply</h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Revise your details and Aadhaar document to re-submit for Admin review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 text-lg font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {resubmitError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{resubmitError}</span>
              </div>
            )}

            {/* Admin Rejection Reason Reminder */}
            {provider.rejection_reason && (
              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1">
                <div className="text-[10px] font-black uppercase text-rose-700 tracking-wider">
                  Admin Feedback to Address:
                </div>
                <div className="text-xs font-bold text-rose-900">
                  "{provider.rejection_reason}"
                </div>
              </div>
            )}

            {/* Section 1: Trade Categories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-brand-navy uppercase tracking-wider">
                  1. Trade Skill Categories ({resubmitCategories.length} selected)
                </label>
                <span className="text-[11px] text-slate-400 font-semibold">Tap to select all that apply</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const isSelected = resubmitCategories.includes(c.name);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleResubmitCategory(c.name)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-brand-navy text-white border-brand-navy shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-orange" />}
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Patna Service Localities */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-brand-navy uppercase tracking-wider">
                  2. Patna Service Areas ({resubmitLocalities.length} selected)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (resubmitLocalities.length === PATNA_LOCALITIES.length) {
                      setResubmitLocalities([]);
                    } else {
                      setResubmitLocalities([...PATNA_LOCALITIES]);
                    }
                  }}
                  className="text-[11px] font-bold text-brand-orange hover:underline cursor-pointer"
                >
                  {resubmitLocalities.length === PATNA_LOCALITIES.length ? "Clear All" : "Select All Patna"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PATNA_LOCALITIES.map((loc) => {
                  const isSelected = resubmitLocalities.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => toggleResubmitLocality(loc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-orange-50 text-brand-orange border-brand-orange shadow-2xs font-extrabold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-brand-orange" />}
                      <span>{loc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Bank Branch & KYC Details */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Building2 className="w-4 h-4 text-brand-orange" />
                <span className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                  3. Payout Bank & KYC Verification Details
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Bank Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={resubmitHolder}
                    onChange={(e) => setResubmitHolder(e.target.value)}
                    placeholder="Must match Aadhaar name"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-brand-ink focus:border-brand-orange focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Bank Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={resubmitAccount}
                    onChange={(e) => setResubmitAccount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 123456789012"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-brand-ink focus:border-brand-orange focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Bank IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={resubmitIfsc}
                    onChange={(e) => setResubmitIfsc(e.target.value.toUpperCase().trim())}
                    placeholder="e.g. SBIN0001234"
                    maxLength={11}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-brand-ink focus:border-brand-orange focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    UPI ID for Payouts (Optional)
                  </label>
                  <input
                    type="text"
                    value={resubmitUpi}
                    onChange={(e) => setResubmitUpi(e.target.value.trim())}
                    placeholder="e.g. name@okhdfcbank"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-brand-ink focus:border-brand-orange focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Aadhaar Identity Proof */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                  4. Aadhaar Card Document (KYC)
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {provider.adhaar_card_url ? "Currently on file" : "Upload required"}
                </span>
              </div>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => setResubmitAdhaarFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-orange-50 file:text-brand-orange file:cursor-pointer cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 font-medium">
                {resubmitAdhaarFile ? (
                  <span className="text-emerald-700 font-bold">
                    ✓ New document selected: {resubmitAdhaarFile.name}
                  </span>
                ) : (
                  <span>
                    Upload a high-clarity photo or PDF of your Aadhaar card if the admin reported document clarity or mismatch issues.
                  </span>
                )}
              </p>
            </div>

            {/* Section 5: Experience & Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={resubmitExp}
                  onChange={(e) => setResubmitExp(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-brand-ink focus:border-brand-orange focus:outline-hidden"
                />
              </div>
              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resubmitHasTools}
                    onChange={(e) => setResubmitHasTools(e.target.checked)}
                    className="w-4 h-4 text-brand-orange rounded-md border-slate-300 focus:ring-brand-orange"
                  />
                  <span className="font-extrabold text-brand-navy text-xs">
                    I own my professional repair/service toolset
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResubmitModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResubmitting ? "animate-spin" : ""}`} />
                <span>{isResubmitting ? "Submitting..." : "Re-submit Application for Review"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
