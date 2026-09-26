import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  UserCheck,
  Truck,
  Sparkles,
  Phone,
  ShieldCheck,
  KeyRound,
  MapPin,
  Calendar,
  Edit3,
} from 'lucide-react';

interface BookingTrackerProps {
  booking: {
    id: string;
    service_name?: string;
    category_name?: string;
    status: string;
    scheduled_at?: string;
    address?: string;
    otp?: string;
    provider?: {
      name: string;
      phone: string;
      rating: number;
    };
    created_at?: string;
    total_amount?: number;
    final_amount?: number;
  };
  onCancelBooking?: (id: string) => void;
}

const STATUS_STEPS = [
  { key: 'requested', label: 'Booking Placed', icon: Clock },
  { key: 'accepted', label: 'Partner Assigned', icon: UserCheck },
  { key: 'on_the_way', label: 'On The Way', icon: Truck },
  { key: 'in_progress', label: 'Service Started', icon: Sparkles },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const STATUS_INDEX_MAP: Record<string, number> = {
  pending: 0,
  requested: 0,
  accepted: 1,
  on_the_way: 2,
  in_progress: 3,
  completed: 4,
};

export const BookingTracker: React.FC<BookingTrackerProps> = ({ booking }) => {
  const normalizedStatus = (booking.status || 'requested').toLowerCase();
  const currentStatusIndex = STATUS_INDEX_MAP[normalizedStatus] ?? 0;

  const [payeeUpi, setPayeeUpi] = useState(() => {
    return localStorage.getItem("ghartak_payee_upi") || "ghartak@okaxis";
  });
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [tempUpi, setTempUpi] = useState(payeeUpi);

  const handleSaveUpi = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempUpi.trim();
    if (!clean) return;
    setPayeeUpi(clean);
    localStorage.setItem("ghartak_payee_upi", clean);
    setIsEditingUpi(false);
  };

  const handleResetUpi = () => {
    localStorage.removeItem("ghartak_payee_upi");
    setPayeeUpi("ghartak@okaxis");
    setTempUpi("ghartak@okaxis");
    setIsEditingUpi(false);
  };

  const amountToPay = booking.final_amount || booking.total_amount || 199;
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(payeeUpi)}&pn=${encodeURIComponent("GharTak Patna")}&am=${amountToPay}&tn=${encodeURIComponent(`Order_${booking.id.slice(0, 8)}`)}&cu=INR`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiDeepLink)}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          {normalizedStatus === 'completed' ? (
            <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed Order #{booking.id.slice(0, 8)}</span>
            </div>
          ) : normalizedStatus.startsWith('cancel') ? (
            <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Cancelled Order #{booking.id.slice(0, 8)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-black uppercase text-brand-orange">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
              <span>Active Order #{booking.id.slice(0, 8)}</span>
            </div>
          )}
          <h3 className="text-xl font-black text-brand-navy mt-1">
            {booking.service_name || booking.category_name || 'Home Service'}
          </h3>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold text-slate-400">Total Price</div>
          <div className="text-lg font-black text-brand-navy">₹{booking.total_amount || 499}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">
          Live Status Timeline
        </div>

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-slate-100 -z-0">
            <div
              className="h-full bg-brand-orange transition-all duration-500"
              style={{
                width: `${(currentStatusIndex / (STATUS_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          {STATUS_STEPS.map((step, idx) => {
            const isDone = idx <= currentStatusIndex;
            const isCurrent = idx === currentStatusIndex;
            const IconComp = step.icon;

            return (
              <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 z-10">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-xs transition-all ${
                    isCurrent
                      ? 'bg-brand-orange text-white shadow-lg ring-4 ring-orange-100 scale-110'
                      : isDone
                      ? 'bg-brand-navy text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="text-left sm:text-center">
                  <div
                    className={`text-xs font-extrabold ${
                      isDone ? 'text-brand-navy' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      Current
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {normalizedStatus !== 'completed' && !normalizedStatus.startsWith('cancel') && (
        <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-orange text-white rounded-xl shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-brand-navy">Service Start OTP</div>
              <div className="text-[11px] font-semibold text-slate-500">
                Share this 4-digit code with partner on arrival
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-white border border-orange-300 rounded-xl font-black text-xl tracking-widest text-brand-navy shadow-sm">
            {booking.otp || 'Pending'}
          </div>
        </div>
      )}

      {normalizedStatus === 'completed' && (
        <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-emerald-950">Service Completed!</h4>
                <p className="text-xs text-emerald-700 font-medium">Pay via Cash on Service or Scan UPI</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-emerald-700 uppercase">Amount</div>
              <div className="text-lg font-black text-emerald-950">₹{booking.final_amount || booking.total_amount || 199}</div>
            </div>
          </div>

          {/* Dynamic UPI QR Code for Client Demo */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full uppercase">
                  Zero-Fee UPI Payment
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-bold">
                  {payeeUpi}
                </span>
              </div>
              <div className="font-black text-sm text-brand-navy">Scan with GPay, PhonePe, Paytm, or BHIM</div>
              <p className="text-[11px] text-slate-500">
                Direct bank-to-bank settlement via NPCI with zero gateway commission.
              </p>

              {isEditingUpi ? (
                <form onSubmit={handleSaveUpi} className="flex items-center gap-2 pt-1 max-w-sm">
                  <input
                    type="text"
                    value={tempUpi}
                    onChange={(e) => setTempUpi(e.target.value)}
                    placeholder="Enter active UPI ID (e.g. yourname@okicici)"
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-brand-navy text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempUpi(payeeUpi);
                      setIsEditingUpi(false);
                    }}
                    className="px-2 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <a
                    href={upiDeepLink}
                    className="inline-block text-xs font-bold text-emerald-700 underline hover:text-emerald-800"
                  >
                    Open UPI App directly
                  </a>
                  <span className="text-slate-300 text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempUpi(payeeUpi);
                      setIsEditingUpi(true);
                    }}
                    className="text-xs font-bold text-brand-orange hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Change UPI ID for Live Test</span>
                  </button>
                  {payeeUpi !== "ghartak@okaxis" && (
                    <>
                      <span className="text-slate-300 text-xs">•</span>
                      <button
                        type="button"
                        onClick={handleResetUpi}
                        className="text-xs font-bold text-slate-400 hover:text-rose-600 underline"
                      >
                        Reset to Demo
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0 flex flex-col items-center">
              <img
                src={qrCodeImageUrl}
                alt="UPI Payment QR Code"
                className="w-32 h-32 rounded-xl"
              />
              <span className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-wider">
                Scan to Pay ₹{amountToPay}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-navy text-white rounded-2xl flex items-center justify-center font-black text-lg">
            {booking.provider?.name ? booking.provider.name[0] : 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-extrabold text-sm text-brand-navy">
                {booking.provider?.name || 'Awaiting Partner Assignment'}
              </div>
              {booking.provider?.name && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {booking.provider?.name ? 'Verified Patna Partner' : 'Finding top-rated professional near your location'}
            </div>
          </div>
        </div>

        {booking.provider?.name && (
          <a
            href={`tel:${booking.provider?.phone || '9876543210'}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-brand-navy shadow-sm transition-all"
          >
            <Phone className="w-4 h-4 text-brand-orange" />
            <span>Call Partner</span>
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Scheduled: {booking.scheduled_at || 'Today'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">
            {[booking.address, booking.category_name].filter(Boolean).join(' • ') || 'Patna'}
          </span>
        </div>
      </div>
    </div>
  );
};

