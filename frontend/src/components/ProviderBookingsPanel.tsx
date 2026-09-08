import React, { useEffect, useState } from "react";
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
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { Booking } from "../types/booking";
import { ProviderProfile } from "../types/marketplace";

type ProviderTabKey = "jobs" | "profile" | "earnings";

export function ProviderBookingsPanel() {
  const [activeTab, setActiveTab] = useState<ProviderTabKey>("jobs");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [status, setStatus] = useState("");
  const [otpInput, setOtpInput] = useState<Record<string, string>>({});

  const loadBookings = async () => {
    try {
      const providerResponse = await apiRequest<ProviderProfile>("/provider/me");
      setProvider(providerResponse);

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
    void loadBookings();
  }, []);

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
      await loadBookings();
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
            Manage Patna job dispatches, OTP verifications, and weekly earnings.
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
            { key: "profile", label: "Partner Profile & Skills", icon: UserCheck },
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

          {/* TAB 2: PARTNER PROFILE */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-orange" />
                <span>Partner Profile & Skill Credentials</span>
              </h3>

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
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Skill Categories</span>
                  <span className="text-brand-navy font-extrabold text-sm block">
                    {provider?.categories.join(", ") || "General"}
                  </span>
                </div>
              </div>
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
