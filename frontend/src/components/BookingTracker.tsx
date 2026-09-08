import React from 'react';
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase text-brand-orange">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
            <span>Active Order #{booking.id.slice(0, 8)}</span>
          </div>
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

      {normalizedStatus !== 'completed' && (
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
            {booking.otp || '4892'}
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
              {booking.provider?.name ? '4.9 ★ Rating • Verified Patna Partner' : 'Finding top-rated professional near your location'}
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
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Scheduled: {booking.scheduled_at || 'Today'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400 truncate" />
          <span className="truncate">{booking.address || 'Patna'}</span>
        </div>
      </div>
    </div>
  );
};

