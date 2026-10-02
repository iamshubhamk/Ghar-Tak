import { FormEvent, useEffect, useState } from "react";
import {
  LogIn,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Sparkles,
  Briefcase,
  Upload,
  FileText,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Wrench,
  AlertCircle,
  Camera,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { apiBaseUrl } from "../lib/config";
import { AuthResponse, User } from "../types/auth";
import { Category } from "../types/marketplace";

type PrimaryTab = "login" | "signup" | "forgot_password";
type SignupRole = "customer" | "provider";
type ProviderStep = 1 | 2 | 3;

type AuthPanelProps = {
  onAuthenticated: (user: User) => void;
  initialMode?: "login" | "customer" | "provider";
  allowedModes?: string[];
  heading?: string;
  subheading?: string;
};

const PATNA_LOCALITIES = [
  "Boring Road",
  "Kankarbagh",
  "Bailey Road",
  "Rajendra Nagar",
  "Patliputra",
  "Danapur",
  "Anisabad",
  "Fraser Road",
  "Ashok Rajpath",
  "Khagaul",
];

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

  // Provider Wizard Step State (1: Personal, 2: Skills/Localities, 3: Bank/KYC)
  const [providerStep, setProviderStep] = useState<ProviderStep>(1);

  // Step 1: Core credentials
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Step 2: Trade & Coverage
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([
    "Boring Road",
    "Kankarbagh",
  ]);
  const [experienceYears, setExperienceYears] = useState("3");
  const [hasTools, setHasTools] = useState(true);
  const [bio, setBio] = useState("");

  // Step 3: Bank Details & Mandatory Aadhaar
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [payoutUpiId, setPayoutUpiId] = useState("");
  const [bankProofFile, setBankProofFile] = useState<File | null>(null);
  const [adhaarCardFile, setAdhaarCardFile] = useState<File | null>(null);
  const [consentAgreed, setConsentAgreed] = useState(false);

  // Status & loading
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Fetch live categories for trade selection
  useEffect(() => {
    apiRequest<Category[]>("/categories")
      .then((cats) => {
        setAvailableCategories(cats.filter((c) => c.is_active));
        if (cats.length > 0 && selectedCategoryIds.length === 0) {
          setSelectedCategoryIds([cats[0].id]);
        }
      })
      .catch(() => {
        // Fallback or offline
      });
  }, []);

  // Update photo preview
  const handlePhotoSelect = (file: File | null) => {
    setProfilePhotoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const toggleLocality = (loc: string) => {
    setSelectedLocalities((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleSelectAllPatna = () => {
    if (selectedLocalities.length === PATNA_LOCALITIES.length) {
      setSelectedLocalities([]);
    } else {
      setSelectedLocalities([...PATNA_LOCALITIES]);
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      setStatus("Please enter your full legal name.");
      return false;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setStatus("Please enter a valid 10-digit mobile number.");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      setStatus("Please enter a valid email address.");
      return false;
    }
    if (!password || password.length < 6) {
      setStatus("Password must be at least 6 characters long.");
      return false;
    }
    setStatus("");
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (selectedCategoryIds.length === 0) {
      setStatus("Please select at least 1 trade skill category.");
      return false;
    }
    if (selectedLocalities.length === 0) {
      setStatus("Please select at least 1 operating locality in Patna.");
      return false;
    }
    setStatus("");
    return true;
  };

  // Step 3 Validation & Submit
  const handleProviderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("");

    if (!bankAccountHolder.trim()) {
      setStatus("Please enter the bank account holder's name.");
      return;
    }
    if (!bankAccountNumber.trim()) {
      setStatus("Please enter your bank account number.");
      return;
    }
    if (bankAccountNumber.trim() !== confirmAccountNumber.trim()) {
      setStatus("Bank account numbers do not match. Please verify.");
      return;
    }
    if (!bankIfsc.trim() || bankIfsc.trim().length < 8) {
      setStatus("Please enter a valid bank IFSC code (e.g. SBIN0001234).");
      return;
    }
    if (!adhaarCardFile) {
      setStatus("Aadhaar card upload is mandatory for technician background verification.");
      return;
    }
    if (!consentAgreed) {
      setStatus("You must agree to the background verification consent to proceed.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("phone", phone.trim());
      formData.append("password", password);
      formData.append("bio", bio.trim());
      formData.append("experience_years", experienceYears || "0");
      formData.append("has_tools", hasTools ? "true" : "false");
      formData.append("category_ids", JSON.stringify(selectedCategoryIds));
      formData.append("localities", JSON.stringify(selectedLocalities));
      formData.append("bank_account_holder", bankAccountHolder.trim());
      formData.append("bank_account_number", bankAccountNumber.trim());
      formData.append("bank_ifsc", bankIfsc.trim().toUpperCase());
      if (payoutUpiId.trim()) {
        formData.append("payout_upi_id", payoutUpiId.trim());
      }
      formData.append("adhaar_card", adhaarCardFile);
      if (profilePhotoFile) {
        formData.append("profile_photo", profilePhotoFile);
      }
      if (bankProofFile) {
        formData.append("bank_proof", bankProofFile);
      }

      const res = await fetch(`${apiBaseUrl}/auth/register/provider`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg =
          data?.detail?.error?.message ||
          (typeof data?.detail === "string" ? data.detail : null) ||
          "Failed to register provider application. Please try again.";
        throw new Error(errorMsg);
      }

      localStorage.setItem("ghartak_token", data.access_token);
      onAuthenticated(data.user);
      setStatus(`Application submitted! Welcome, ${data.user.name}.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Standard Customer / Login Submit
  const handleStandardSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    const isLogin = activeTab === "login";
    const endpoint = isLogin ? "/auth/login" : "/auth/register/customer";
    const payload = isLogin
      ? { email, password }
      : { name, email, phone, password };

    try {
      const response = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      localStorage.setItem("ghartak_token", response.access_token);
      onAuthenticated(response.user);
      setStatus(`Welcome! Logged in as ${response.user.name}.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please check your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Verify identity via email and phone
  const handleVerifyIdentity = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("");
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setStatus("Please enter a valid email address.");
      return;
    }
    const cleanPhone = forgotPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setStatus("Please enter your registered 10-digit mobile number.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await apiRequest<{ name: string; verified: boolean }>(
        "/auth/password-reset/verify",
        {
          method: "POST",
          body: JSON.stringify({
            email: forgotEmail.trim(),
            phone: forgotPhone.trim(),
          }),
        }
      );
      setVerifiedName(res.name || "User");
      setForgotStep(2);
      setStatus("");
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "No account found matching this email and mobile number."
      );
    } finally {
      setIsResetting(false);
    }
  };

  // Step 2: Set new password and auto-login
  const handleResetPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("");
    if (!newPassword || newPassword.length < 6) {
      setStatus("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("Passwords do not match. Please re-enter.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await apiRequest<AuthResponse>("/auth/password-reset", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail.trim(),
          phone: forgotPhone.trim(),
          new_password: newPassword,
        }),
      });
      localStorage.setItem("ghartak_token", res.access_token);
      onAuthenticated(res.user);
      setStatus(`Password reset successfully! Welcome back, ${res.user.name}.`);
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Password reset failed. Please try again."
      );
    } finally {
      setIsResetting(false);
    }
  };

  const isProviderWizard = activeTab === "signup" && signupRole === "provider";

  return (
    <div className="min-h-[calc(100vh-80px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center bg-slate-50/60">
      {/* Brand Header Banner */}
      <div className="text-center max-w-lg mb-6 sm:mb-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-[11px] font-black uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>GharTak Patna Home Services</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-navy tracking-tight">
          {activeTab === "forgot_password"
            ? forgotStep === 1
              ? "Recover Your Account"
              : "Create New Password"
            : activeTab === "login"
            ? "Sign in to Your Account"
            : signupRole === "provider"
            ? "Become a GharTak Service Partner"
            : "Create Your Customer Account"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          {activeTab === "forgot_password"
            ? forgotStep === 1
              ? "Confirm your registered email and mobile phone number to verify your identity."
              : `Account verified for ${verifiedName}. Enter your new password below.`
            : activeTab === "login"
            ? "Access your Patna customer bookings, partner jobs, or admin portal."
            : signupRole === "provider"
            ? "Join Patna's technician network with guaranteed local bookings and direct bank payouts."
            : "Book verified electricians, plumbers, and home repair experts across Patna."}
        </p>
      </div>

      {/* Main Centered Card Container */}
      <div
        className={`w-full bg-white rounded-3xl border border-slate-200 shadow-floating transition-all p-6 sm:p-10 ${
          isProviderWizard ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        {/* Top Navigation: Either Forgot Password Header or Tabs */}
        {activeTab === "forgot_password" ? (
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setStatus("");
                setForgotStep(1);
              }}
              className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-brand-navy transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-brand-orange text-xs font-black rounded-full">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Step {forgotStep} of 2</span>
            </div>
          </div>
        ) : (
          /* Top 2 Primary Tabs: Log In | Sign Up */
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setStatus("");
              }}
              className={`w-1/2 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === "login"
                  ? "bg-brand-navy text-white shadow-md"
                  : "text-slate-600 hover:text-brand-navy"
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("signup");
                setStatus("");
              }}
              className={`w-1/2 py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === "signup"
                  ? "bg-brand-navy text-white shadow-md"
                  : "text-slate-600 hover:text-brand-navy"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </div>
        )}

        {/* SIGN UP ROLE SELECTION (CUSTOMER VS PARTNER) */}
        {activeTab === "signup" && (
          <div className="space-y-2 mb-6">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              Choose Account Type
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  setSignupRole("customer");
                  setStatus("");
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  signupRole === "customer"
                    ? "bg-orange-50/80 border-brand-orange ring-2 ring-orange-200 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <UserCheck
                    className={`w-5 h-5 ${
                      signupRole === "customer" ? "text-brand-orange" : "text-slate-400"
                    }`}
                  />
                  {signupRole === "customer" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                  )}
                </div>
                <div className="font-extrabold text-sm text-brand-navy mt-2.5">Customer</div>
                <div className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                  Book home services in Patna
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSignupRole("provider");
                  setStatus("");
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  signupRole === "provider"
                    ? "bg-orange-50/80 border-brand-orange ring-2 ring-orange-200 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Briefcase
                    className={`w-5 h-5 ${
                      signupRole === "provider" ? "text-brand-orange" : "text-slate-400"
                    }`}
                  />
                  {signupRole === "provider" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                  )}
                </div>
                <div className="font-extrabold text-sm text-brand-navy mt-2.5">Service Partner</div>
                <div className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                  Earn with skills across Patna
                </div>
              </button>
            </div>
          </div>
        )}

        {activeTab === "forgot_password" ? (
          <div className="space-y-6">
            {forgotStep === 1 ? (
              /* Step 1: Verify Identity */
              <form onSubmit={handleVerifyIdentity} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-brand-navy block">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-hidden focus:border-brand-orange"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-brand-navy block">
                    Registered Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-hidden focus:border-brand-orange"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    We verify both your registered email and mobile number to confirm account ownership.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isResetting ? (
                    <span>Verifying Account...</span>
                  ) : (
                    <>
                      <span>Verify Account & Continue</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Set New Password */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-900">Identity Verified</div>
                    <div className="text-[11px] font-semibold text-emerald-700">
                      Welcome back, {verifiedName}! Choose a new password for your account.
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-brand-navy block">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-hidden focus:border-brand-orange"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-brand-navy block">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-hidden focus:border-brand-orange"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-500 font-bold">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isResetting || !newPassword || newPassword !== confirmPassword}
                  className="w-full py-4 bg-brand-navy hover:bg-slate-800 text-white rounded-2xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isResetting ? (
                    <span>Updating Password...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-brand-orange" />
                      <span>Update Password & Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : isProviderWizard ? (
          <div className="space-y-6">
            {/* Wizard Step Progress Tracker */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
              {[
                { step: 1 as ProviderStep, label: "1. Identity & Contact" },
                { step: 2 as ProviderStep, label: "2. Trade & Coverage" },
                { step: 3 as ProviderStep, label: "3. Bank & Aadhaar KYC" },
              ].map(({ step, label }) => {
                const isCurrent = providerStep === step;
                const isPassed = providerStep > step;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
                      isCurrent
                        ? "bg-brand-navy text-white shadow-sm"
                        : isPassed
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isCurrent
                          ? "bg-brand-orange text-white"
                          : isPassed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isPassed ? "✓" : step}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                );
              })}
            </div>

            {/* STEP 1: Personal & Contact Details */}
            {providerStep === 1 && (
              <div className="space-y-5">
                {/* Photo Upload with circular preview */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-7 h-7 text-slate-300" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-brand-navy block">
                      Partner Profile Photo (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)}
                      className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-orange-50 file:text-brand-orange hover:file:bg-orange-100 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      A clear headshot helps Patna customers recognize you.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-brand-navy block">
                    Full Legal Name (As on Aadhaar / Bank Passbook) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-brand-navy block">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-brand-navy block">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-brand-navy block">Create Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setProviderStep(2);
                  }}
                  className="w-full py-4 bg-brand-navy hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mt-4"
                >
                  <span>Continue to Trade Skills & Coverage</span>
                  <ChevronRight className="w-4 h-4 text-brand-orange" />
                </button>
              </div>
            )}

            {/* STEP 2: Trade Skills, Tools, and Patna Localities */}
            {providerStep === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-brand-navy block">
                      Select Your Trade Category *
                    </label>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {selectedCategoryIds.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {availableCategories.map((c) => {
                      const isSelected = selectedCategoryIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCategory(c.id)}
                          className={`p-3 rounded-2xl border text-left text-xs font-extrabold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-brand-navy text-white border-brand-navy shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{c.name}</span>
                            {isSelected && <span className="text-brand-orange">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-brand-navy block">
                      Years of Experience
                    </label>
                    <select
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                    >
                      <option value="1">1 Year</option>
                      <option value="2">2 Years</option>
                      <option value="3">3 Years</option>
                      <option value="5">5+ Years</option>
                      <option value="10">10+ Years</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-brand-navy block">
                      Professional Toolset
                    </label>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-brand-orange" />
                        <span className="text-xs font-bold text-brand-navy">Own repair tools</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasTools}
                        onChange={(e) => setHasTools(e.target.checked)}
                        className="w-4 h-4 text-brand-orange rounded-md border-slate-300 focus:ring-brand-orange"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-brand-navy block">
                      Operating Localities in Patna *
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllPatna}
                      className="text-[11px] font-bold text-brand-orange hover:underline cursor-pointer"
                    >
                      {selectedLocalities.length === PATNA_LOCALITIES.length
                        ? "Clear All"
                        : "Select All Patna"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PATNA_LOCALITIES.map((loc) => {
                      const isSelected = selectedLocalities.includes(loc);
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => toggleLocality(loc)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-orange-50 text-brand-orange border-brand-orange shadow-2xs font-extrabold"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {loc} {isSelected && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-brand-navy block">
                    Bio / Experience Summary (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Briefly describe your specialization (e.g. Inverter repair, house rewiring, sanitary pipe fitting)..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProviderStep(1);
                      setStatus("");
                    }}
                    className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep2()) setProviderStep(3);
                    }}
                    className="w-2/3 py-4 bg-brand-navy hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span>Continue to Bank & Aadhaar KYC</span>
                    <ChevronRight className="w-4 h-4 text-brand-orange" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Bank Account & Mandatory Aadhaar Upload */}
            {providerStep === 3 && (
              <form onSubmit={handleProviderSubmit} className="space-y-5">
                <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200/80 space-y-3">
                  <div className="flex items-center gap-2 border-b border-orange-200 pb-2">
                    <Building2 className="w-4 h-4 text-brand-orange" />
                    <span className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                      Direct Bank Account for Customer Payouts
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-brand-navy block">
                      Account Holder Name (As per Bank & Aadhaar) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar Sharma"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-brand-navy block">
                        Bank Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 123456789012"
                        value={bankAccountNumber}
                        onChange={(e) =>
                          setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-brand-navy block">
                        Confirm Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Re-type account number"
                        value={confirmAccountNumber}
                        onChange={(e) =>
                          setConfirmAccountNumber(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-brand-navy block">
                        Bank IFSC Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        placeholder="e.g. SBIN0001234"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase().trim())}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-brand-navy block">
                        UPI ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 9876543210@paytm"
                        value={payoutUpiId}
                        onChange={(e) => setPayoutUpiId(e.target.value.trim())}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold text-slate-600 block">
                      Passbook Front Page / Cancelled Cheque (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={(e) => setBankProofFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-white file:text-brand-orange border border-orange-200 p-1.5 rounded-xl w-full bg-white/60 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Mandatory Aadhaar Upload */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-orange" />
                      <span className="text-xs font-extrabold text-brand-navy uppercase tracking-wider">
                        Aadhaar Card Document (Mandatory KYC) *
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-rose-600 uppercase bg-rose-50 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  </div>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => setAdhaarCardFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-orange-50 file:text-brand-orange border border-slate-200 p-2 rounded-xl w-full bg-white cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Upload clear photo or PDF (Front & Back). Securely stored for admin identity verification.
                  </p>
                </div>

                {/* Legal & KYC Consent */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={consentAgreed}
                      onChange={(e) => setConsentAgreed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-brand-orange rounded-md border-slate-300 focus:ring-brand-orange"
                    />
                    <span className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                      I confirm that the bank and Aadhaar KYC documents provided belong to me and understand that GharTak verifies background credentials before service activation in Patna.
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProviderStep(2);
                      setStatus("");
                    }}
                    className="w-1/3 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-4 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* BRANCH B: STANDARD CUSTOMER SIGNUP OR LOGIN FORM               */
          /* ============================================================== */
          <form onSubmit={handleStandardSubmit} className="space-y-4 sm:space-y-5">
            {activeTab === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-brand-navy block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shubham Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-brand-navy block">Email Address *</label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
              />
            </div>

            {activeTab === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-brand-navy block">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-brand-navy block">Password *</label>
                {activeTab === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("forgot_password");
                      setForgotStep(1);
                      setForgotEmail(email);
                      setForgotPhone(phone);
                      setStatus("");
                    }}
                    className="text-xs font-bold text-brand-orange hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-4 cursor-pointer"
            >
              {isSubmitting
                ? "Processing..."
                : activeTab === "login"
                ? "Sign In to Account"
                : "Register as Customer"}
            </button>
          </form>
        )}

        {status && (
          <div className="mt-5 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-xs sm:text-sm font-bold text-brand-navy text-center">
            {status}
          </div>
        )}

        {/* Footer switch prompt */}
        {activeTab !== "forgot_password" && (
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500 font-semibold">
            {activeTab === "login" ? (
              <div>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setSignupRole("customer");
                    setStatus("");
                  }}
                  className="text-brand-orange font-black hover:underline cursor-pointer"
                >
                  Sign up as Customer
                </button>{" "}
                or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setSignupRole("provider");
                    setStatus("");
                  }}
                  className="text-brand-navy font-black hover:underline cursor-pointer"
                >
                  Join as Partner
                </button>
              </div>
            ) : (
              <div>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setStatus("");
                  }}
                  className="text-brand-orange font-black hover:underline cursor-pointer"
                >
                  Sign In here
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
