import React, { FormEvent, useEffect, useState } from "react";
import {
  User,
  ShoppingBag,
  MapPin,
  Wallet,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  CalendarClock,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  UserRound,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { apiBaseUrl, backendBaseUrl } from "../lib/config";
import { Booking, Review } from "../types/booking";
import { Category } from "../types/marketplace";
import { BookingTracker } from "./BookingTracker";
import { DateTimePicker } from "./DateTimePicker";

type TabKey = "profile" | "orders" | "addresses" | "wallet" | "payments";

interface SavedAddress {
  id: string;
  tag: string; // 'Home', 'Office', etc.
  full_address: string;
  pincode: string;
  is_default: boolean;
}

interface PaymentMethodItem {
  id: string;
  type: "upi" | "card";
  title: string; // 'UPI: shubham@okicici' or 'HDFC Bank Visa ending in 4242'
  detail: string;
  is_default: boolean;
}

export function CustomerDashboard({ pendingCategoryName }: { pendingCategoryName?: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("orders");

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  // New Service Booking form modal state
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [locality, setLocality] = useState("Boring Road, Patna");
  const [preferredDateTime, setPreferredDateTime] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  // Addresses State (Editable & Manageable)
  const [addresses, setAddresses] = useState<SavedAddress[]>([
    {
      id: "addr-1",
      tag: "Home",
      full_address: "House No 42, Boring Road, Near High Court, Patna",
      pincode: "800001",
      is_default: true,
    },
    {
      id: "addr-2",
      tag: "Office",
      full_address: "3rd Floor, Software Technology Park, Bailey Road, Patna",
      pincode: "800014",
      is_default: false,
    },
  ]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressTag, setAddressTag] = useState("Home");
  const [addressFull, setAddressFull] = useState("");
  const [addressPincode, setAddressPincode] = useState("800001");

  // Wallet State
  const [walletBalance, setWalletBalance] = useState(250);
  const [walletHistory] = useState([
    { id: "tx-1", type: "credit", amount: 250, title: "Welcome Promo Cashback", date: "Today" },
  ]);

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([
    { id: "pm-1", type: "upi", title: "GPay / BHIM UPI", detail: "shubham@okicici", is_default: true },
  ]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<"upi" | "card">("upi");
  const [newPaymentValue, setNewPaymentValue] = useState("");

  // Tracking & Filtering States
  const [selectedTrackingBookingId, setSelectedTrackingBookingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const loadInitialData = async () => {
    try {
      const [categoryResponse, bookingResponse, authResponse] = await Promise.all([
        apiRequest<Category[]>("/categories"),
        apiRequest<Booking[]>("/bookings/my"),
        apiRequest<any>("/auth/me"),
      ]);
      setCategories(categoryResponse);
      setBookings(bookingResponse);
      if (authResponse?.customer_profile?.profile_photo_url) {
        setCustomerPhotoUrl(authResponse.customer_profile.profile_photo_url);
      }
      if (!categoryId && categoryResponse.length > 0) {
        setCategoryId(categoryResponse[0].id);
      }
    } catch (error) {
      // Graceful offline fallback
    }
  };

  useEffect(() => {
    void loadInitialData();
    const pollInterval = setInterval(() => {
      apiRequest<Booking[]>("/bookings/my")
        .then((updatedBookings) => setBookings(updatedBookings))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(pollInterval);
  }, []);

  // Form submit for booking
  const createBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    try {
      const payload = {
        category_id: categoryId,
        locality,
        preferred_datetime: new Date(preferredDateTime).toISOString(),
        issue_description: issueDescription,
      };

      const booking = await apiRequest<Booking>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setBookings((current) => [booking, ...current]);
      setSelectedTrackingBookingId(booking.id);
      setIssueDescription("");
      setIsNewBookingOpen(false);
      setActiveTab("orders");
      setStatus("Service booking submitted! Live status tracking active below.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Booking failed.");
    }
  };

  // Upload photo
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
          Authorization: `Bearer ${localStorage.getItem("ghartak_token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setCustomerPhotoUrl(data.customer_profile?.profile_photo_url);
      setStatus("Profile photo updated!");
      setPhotoFile(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  // Manage Addresses
  const handleSaveAddress = (e: FormEvent) => {
    e.preventDefault();
    if (!addressFull.trim()) return;

    if (editingAddressId) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editingAddressId
            ? { ...a, tag: addressTag, full_address: addressFull, pincode: addressPincode }
            : a
        )
      );
    } else {
      setAddresses((prev) => [
        ...prev,
        {
          id: `addr-${Date.now()}`,
          tag: addressTag,
          full_address: addressFull,
          pincode: addressPincode,
          is_default: prev.length === 0,
        },
      ]);
    }

    setIsAddressModalOpen(false);
    setEditingAddressId(null);
    setAddressFull("");
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  // Manage Payment Methods
  const handleSavePaymentMethod = (e: FormEvent) => {
    e.preventDefault();
    if (!newPaymentValue.trim()) return;

    setPaymentMethods((prev) => [
      ...prev,
      {
        id: `pm-${Date.now()}`,
        type: newPaymentType,
        title: newPaymentType === "upi" ? "UPI Account" : "Debit / Credit Card",
        detail: newPaymentValue,
        is_default: prev.length === 0,
      },
    ]);

    setIsPaymentModalOpen(false);
    setNewPaymentValue("");
  };

  const activeBookings = bookings.filter(
    (b) => b.status.toUpperCase() !== "COMPLETED" && !b.status.toUpperCase().startsWith("CANCEL")
  );

  const activeBooking =
    bookings.find((b) => b.id === selectedTrackingBookingId) ||
    activeBookings[0] ||
    bookings[0];

  const uniqueCategories = Array.from(
    new Set(bookings.map((b) => b.category_name).filter(Boolean))
  );

  const filteredBookings = bookings.filter((b) => {
    const statusUpper = b.status.toUpperCase();
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
        ? statusUpper !== "COMPLETED" && !statusUpper.startsWith("CANCEL")
        : statusUpper === statusFilter;

    const matchesCategory =
      categoryFilter === "ALL" ? true : b.category_name === categoryFilter;

    return matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Account Top Header Banner */}
      <div className="bg-gradient-to-r from-brand-navy via-slate-900 to-brand-navy-dark rounded-3xl p-6 sm:p-8 text-white shadow-floating mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase text-brand-orange tracking-wider mb-1">
            Customer Account Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Welcome back!</h1>
          <p className="text-xs text-slate-300 font-medium">
            Manage your Patna orders, saved addresses, wallet balance, and payment settings.
          </p>
        </div>

        <button
          onClick={() => setIsNewBookingOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold shadow-lg transition-all shrink-0 hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Service</span>
        </button>
      </div>

      {/* 2-Column Uncluttered Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { key: "orders", label: "My Orders & Status", icon: ShoppingBag, badge: bookings.length },
            { key: "profile", label: "My Profile & Photo", icon: User },
            { key: "addresses", label: "Saved Addresses", icon: MapPin, badge: addresses.length },
            { key: "wallet", label: "Ghar-Tak Wallet", icon: Wallet, badge: `₹${walletBalance}` },
            { key: "payments", label: "Payment Methods", icon: CreditCard, badge: paymentMethods.length },
          ].map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
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

        {/* Right Tab Content Panel */}
        <div className="lg:col-span-3">
          {/* TAB 1: MY ORDERS & ACTIVE LIVE TRACKER */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              {/* Active Order Tracker */}
              {activeBooking && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-brand-orange" />
                      <span>Live Order Tracker</span>
                    </h3>

                    {bookings.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400">Select Order:</span>
                        {bookings.map((b) => {
                          const isSelected = activeBooking?.id === b.id;
                          return (
                            <button
                              key={b.id}
                              onClick={() => setSelectedTrackingBookingId(b.id)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all border ${
                                isSelected
                                  ? "bg-brand-navy text-white border-brand-navy shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              #{b.id.slice(0, 6)} ({b.category_name})
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <BookingTracker
                    booking={{
                      id: activeBooking.id,
                      service_name: activeBooking.category_name,
                      status: activeBooking.status.toLowerCase(),
                      scheduled_at: new Date(activeBooking.preferred_datetime).toLocaleString(),
                      address: activeBooking.locality,
                      provider: activeBooking.provider_name
                        ? { name: activeBooking.provider_name, phone: "9876543210", rating: 4.9 }
                        : undefined,
                    }}
                  />
                </div>
              )}

              {/* Order History */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-brand-orange" />
                    <span>Order History</span>
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Dropdown */}
                    {uniqueCategories.length > 0 && (
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                      >
                        <option value="ALL">All Categories</option>
                        {uniqueCategories.map((catName) => (
                          <option key={catName as string} value={catName as string}>
                            {catName as string}
                          </option>
                        ))}
                      </select>
                    )}
                    <span className="text-xs font-bold text-slate-400">
                      Showing {filteredBookings.length} of {bookings.length}
                    </span>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "ACTIVE", label: "Active" },
                    { id: "REQUESTED", label: "Requested" },
                    { id: "ACCEPTED", label: "Accepted" },
                    { id: "COMPLETED", label: "Completed" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                        statusFilter === st.id
                          ? "bg-brand-navy text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  {filteredBookings.length === 0 && (
                    <div className="py-12 text-center text-xs font-semibold text-slate-400">
                      No matching bookings found for selected filter.
                    </div>
                  )}

                  {filteredBookings.map((b) => {
                    const isCurrentlyTracked = activeBooking?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedTrackingBookingId(b.id);
                          window.scrollTo({ top: 100, behavior: "smooth" });
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isCurrentlyTracked
                            ? "bg-orange-50/60 border-brand-orange ring-2 ring-orange-200 shadow-sm"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-brand-navy">{b.category_name}</span>
                            <span className="text-[10px] font-extrabold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-full">
                              #{b.id.slice(0, 8)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-semibold mt-0.5">
                            {b.provider_name ? `Assigned: ${b.provider_name}` : "Awaiting Patna pro assignment"}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {new Date(b.preferred_datetime).toLocaleString()} • {b.locality}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-start sm:self-auto">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize ${
                              b.status.toUpperCase() === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : b.status.toUpperCase() === "ACCEPTED"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {b.status}
                          </span>
                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                              isCurrentlyTracked
                                ? "bg-brand-orange text-white shadow-sm"
                                : "bg-white border border-slate-200 text-brand-navy hover:bg-slate-50"
                            }`}
                          >
                            {isCurrentlyTracked ? "Tracking" : "Track Status"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY PROFILE & PHOTO */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                <UserRound className="w-5 h-5 text-brand-orange" />
                <span>My Personal Profile</span>
              </h3>

              <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                {customerPhotoUrl ? (
                  <img
                    src={`${backendBaseUrl}${customerPhotoUrl}`}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-4 border-orange-100 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 bg-brand-navy text-white rounded-full flex items-center justify-center font-black text-2xl">
                    C
                  </div>
                )}

                <form onSubmit={uploadCustomerPhoto} className="space-y-2">
                  <label className="block text-xs font-extrabold text-brand-navy">
                    Update Profile Picture
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-orange-50 file:text-brand-orange"
                    />
                    <button
                      type="submit"
                      disabled={!photoFile}
                      className="px-4 py-2 bg-brand-navy hover:bg-brand-navy-dark text-white rounded-xl text-xs font-extrabold transition-all disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Location Scope</span>
                  <span className="text-brand-navy font-extrabold text-sm mt-1 block">Patna Region</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Status</span>
                  <span className="text-emerald-600 font-extrabold text-sm mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Active Verified
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAVED ADDRESSES (EDIT / ADD / DELETE) */}
          {activeTab === "addresses" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-brand-orange" />
                    <span>Saved Patna Addresses</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Manage your delivery and service locations</p>
                </div>
                <button
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressTag("Home");
                    setAddressFull("");
                    setIsAddressModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Address</span>
                </button>
              </div>

              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-brand-navy text-white text-[10px] font-extrabold rounded-full">
                          {addr.tag}
                        </span>
                        {addr.is_default && (
                          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-extrabold text-brand-navy">{addr.full_address}</div>
                      <div className="text-[11px] text-slate-400 font-semibold">Pincode: {addr.pincode}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingAddressId(addr.id);
                          setAddressTag(addr.tag);
                          setAddressFull(addr.full_address);
                          setAddressPincode(addr.pincode);
                          setIsAddressModalOpen(true);
                        }}
                        className="p-2 text-slate-600 hover:text-brand-navy hover:bg-slate-200 rounded-xl transition-colors"
                        title="Edit address"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add / Edit Address Modal */}
              {isAddressModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
                  <form
                    onSubmit={handleSaveAddress}
                    className="w-full max-w-md bg-white rounded-3xl p-6 shadow-floating space-y-4 border border-slate-200"
                  >
                    <h4 className="text-lg font-black text-brand-navy">
                      {editingAddressId ? "Edit Saved Address" : "Add New Patna Address"}
                    </h4>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">Tag / Label</label>
                      <select
                        value={addressTag}
                        onChange={(e) => setAddressTag(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-brand-ink"
                      >
                        <option value="Home">Home</option>
                        <option value="Office">Office</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">Full Address</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="House no., street, locality, landmark..."
                        value={addressFull}
                        onChange={(e) => setAddressFull(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">Pincode</label>
                      <input
                        type="text"
                        required
                        value={addressPincode}
                        onChange={(e) => setAddressPincode(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddressModalOpen(false)}
                        className="w-1/2 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-extrabold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-3 bg-brand-orange text-white rounded-2xl text-xs font-extrabold"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GHAR-TAK WALLET */}
          {activeTab === "wallet" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <div className="p-6 bg-gradient-to-br from-brand-navy to-slate-900 rounded-3xl text-white flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-bold text-orange-200">Ghar-Tak Wallet Balance</div>
                  <div className="text-3xl font-black mt-1">₹{walletBalance}</div>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Wallet className="w-8 h-8 text-brand-orange" />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                  Wallet Transactions & Cashbacks
                </h4>
                <div className="space-y-2">
                  {walletHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-extrabold text-xs text-brand-navy">{tx.title}</div>
                        <div className="text-[11px] text-slate-400">{tx.date}</div>
                      </div>
                      <div className="text-emerald-600 font-black text-sm">+₹{tx.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PAYMENT METHODS (UPI & CARDS) */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-brand-navy flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-brand-orange" />
                    <span>Saved Payment Methods</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Add saved UPI IDs or Cards for fast checkout</p>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Method</span>
                </button>
              </div>

              <div className="space-y-3">
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-extrabold text-xs text-brand-navy">{pm.title}</div>
                      <div className="text-xs font-bold text-brand-orange mt-0.5">{pm.detail}</div>
                    </div>
                    {pm.is_default && (
                      <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        Default Method
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Payment Method Modal */}
              {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
                  <form
                    onSubmit={handleSavePaymentMethod}
                    className="w-full max-w-md bg-white rounded-3xl p-6 shadow-floating space-y-4 border border-slate-200"
                  >
                    <h4 className="text-lg font-black text-brand-navy">Add Payment Method</h4>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">Type</label>
                      <select
                        value={newPaymentType}
                        onChange={(e) => setNewPaymentType(e.target.value as any)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-brand-ink"
                      >
                        <option value="upi">UPI ID (Google Pay, PhonePe, Paytm)</option>
                        <option value="card">Credit / Debit Card</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-brand-navy">
                        {newPaymentType === "upi" ? "UPI ID" : "Card Number"}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={newPaymentType === "upi" ? "e.g. shubham@okicici" : "4111 2222 3333 4444"}
                        value={newPaymentValue}
                        onChange={(e) => setNewPaymentValue(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(false)}
                        className="w-1/2 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-extrabold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-3 bg-brand-orange text-white rounded-2xl text-xs font-extrabold"
                      >
                        Save Payment Method
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Service Booking Request Modal */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
          <form
            onSubmit={createBooking}
            className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-floating space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-lg font-black text-brand-navy">Request a Service in Patna</h4>
              <button
                type="button"
                onClick={() => setIsNewBookingOpen(false)}
                className="p-2 text-slate-400 hover:text-brand-navy rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-brand-navy">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-brand-ink"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.price_label ? `(${c.price_label})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-brand-navy">Patna Locality / Address</label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
              />
            </div>

            <DateTimePicker onChange={(iso) => setPreferredDateTime(iso)} />

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-brand-navy">Requirement Details</label>
              <textarea
                rows={3}
                required
                placeholder="Describe the issue..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-brand-ink"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-brand-orange text-white rounded-2xl text-xs font-extrabold shadow-md"
            >
              Submit Request
            </button>
          </form>
        </div>
      )}

      {status && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-xs font-bold text-brand-navy">
          {status}
        </div>
      )}
    </div>
  );
}
