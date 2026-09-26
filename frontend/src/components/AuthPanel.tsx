import { FormEvent, useState } from "react";
import { LogIn, ShieldCheck, UserCheck, UserPlus, Sparkles, Briefcase } from "lucide-react";

import { apiRequest } from "../lib/api";
import { AuthResponse, User } from "../types/auth";

type PrimaryTab = "login" | "signup";
type SignupRole = "customer" | "provider";

type AuthPanelProps = {
  onAuthenticated: (user: User) => void;
  initialMode?: "login" | "customer" | "provider";
  allowedModes?: string[];
  heading?: string;
  subheading?: string;
};

export function AuthPanel({
  onAuthenticated,
  initialMode = "login",
  heading,
  subheading,
}: AuthPanelProps) {
  const [activeTab, setActiveTab] = useState<PrimaryTab>(
    initialMode === "login" ? "login" : "signup"
  );
  const [signupRole, setSignupRole] = useState<SignupRole>(
    initialMode === "provider" ? "provider" : "customer"
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("1");
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    const isLogin = activeTab === "login";
    const endpoint = isLogin
      ? "/auth/login"
      : signupRole === "customer"
      ? "/auth/register/customer"
      : "/auth/register/provider";

    const payload = isLogin
      ? { email, password }
      : signupRole === "customer"
      ? { name, email, phone, password }
      : {
          name,
          email,
          phone,
          password,
          bio,
          experience_years: Number(experienceYears || 0),
        };

    try {
      const response = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem("ghartak_token", response.access_token);
      onAuthenticated(response.user);
      setStatus(`Welcome! Logged in as ${response.user.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-floating overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Hero Branding Side */}
        <div className="md:col-span-5 bg-gradient-to-br from-brand-navy via-slate-900 to-brand-navy-dark p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-orange/10 rounded-full blur-3xl" />

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/30 text-brand-orange text-[10px] font-black uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Patna Home Marketplace</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight text-white">
              Verified Home Services at Your Doorstep
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-3 leading-relaxed">
              Book skilled electricians, plumbers, carpenters, and appliance repair experts in Patna.
            </p>
          </div>

          <div className="space-y-3 my-8">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-200">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span>100% Background Verified Technicians</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-200">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 text-brand-orange" />
              </div>
              <span>Transparent Pricing & Instant Booking</span>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-slate-400 border-t border-white/10 pt-4">
            Need help? Contact support@ghartak.in
          </div>
        </div>

        {/* Right Form Side */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-6">
          {(heading || subheading) && (
            <div>
              {heading && <h3 className="text-xl font-black text-brand-navy">{heading}</h3>}
              {subheading && <p className="text-xs text-slate-500 font-medium mt-1">{subheading}</p>}
            </div>
          )}

          {/* Top 2 Primary Tabs: Log In | Sign Up */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`w-1/2 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === "login"
                  ? "bg-brand-navy text-white shadow-md"
                  : "text-slate-600 hover:text-brand-navy"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              className={`w-1/2 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === "signup"
                  ? "bg-brand-navy text-white shadow-md"
                  : "text-slate-600 hover:text-brand-navy"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign Up</span>
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* SIGN UP ROLE SELECTION CARDS */}
            {activeTab === "signup" && (
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-brand-navy block">
                  Select Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignupRole("customer")}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      signupRole === "customer"
                        ? "bg-orange-50/80 border-brand-orange ring-2 ring-orange-200"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <UserCheck className={`w-5 h-5 ${signupRole === "customer" ? "text-brand-orange" : "text-slate-400"}`} />
                      {signupRole === "customer" && (
                        <span className="w-2 h-2 rounded-full bg-brand-orange" />
                      )}
                    </div>
                    <div className="font-extrabold text-xs text-brand-navy mt-2">Customer</div>
                    <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Book home services</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole("provider")}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      signupRole === "provider"
                        ? "bg-orange-50/80 border-brand-orange ring-2 ring-orange-200"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Briefcase className={`w-5 h-5 ${signupRole === "provider" ? "text-brand-orange" : "text-slate-400"}`} />
                      {signupRole === "provider" && (
                        <span className="w-2 h-2 rounded-full bg-brand-orange" />
                      )}
                    </div>
                    <div className="font-extrabold text-xs text-brand-navy mt-2">Service Partner</div>
                    <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">Offer services in Patna</div>
                  </button>
                </div>
              </div>
            )}

            {/* FORM INPUT FIELDS */}
            {activeTab === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-brand-navy block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shubham Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-brand-navy block">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
              />
            </div>

            {activeTab === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-brand-navy block">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-brand-navy block">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
              />
            </div>

            {/* Additional Fields for Service Partner Signup */}
            {activeTab === "signup" && signupRole === "provider" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-brand-navy block">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-brand-navy block">Short Bio / Service Work Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Experienced electrician specializing in residential wiring in Patna..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-2"
            >
              {isSubmitting
                ? "Processing..."
                : activeTab === "login"
                ? "Log In to Account"
                : `Register as ${signupRole === "customer" ? "Customer" : "Service Partner"}`}
            </button>
          </form>

          {status && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-xs font-bold text-brand-navy text-center">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
