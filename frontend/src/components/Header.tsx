import React, { useState } from 'react';
import { MapPin, Search, ShoppingBag, User, Bell, ChevronDown, AlertCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { LocationModal } from './LocationModal';
import { NotificationPopover } from './NotificationPopover';

interface HeaderProps {
  currentLocation: string;
  onSelectLocation: (loc: string) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onSearch: (query: string) => void;
  activeRole: string;
  onRoleChange: (role: 'customer' | 'provider' | 'admin') => void;
  userSession: any;
  userRole?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | null;
  onOpenAuth: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocation,
  onSelectLocation,
  cartCount,
  cartTotal,
  onOpenCart,
  onSearch,
  activeRole,
  onRoleChange,
  userSession,
  userRole,
  onOpenAuth,
  onGoHome,
}) => {
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    onSearch(val);
  };

  const isOutsidePatna = !currentLocation.toLowerCase().includes('patna');
  const isProfessionalUser = userRole === 'ADMIN' || userRole === 'PROVIDER';

  return (
    <>
      {/* Geofencing Warning Banner if Outside Patna (Consumer/Guest only) */}
      {!isProfessionalUser && isOutsidePatna && (
        <div className="bg-amber-500 text-white text-xs font-extrabold px-4 py-2 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Ghar-Tak is currently live exclusively in Patna. Service availability in <strong>{currentLocation}</strong> is coming soon!
          </span>
          <button
            onClick={() => setIsLocationOpen(true)}
            className="underline ml-2 text-white hover:text-amber-100 font-black"
          >
            Switch to Patna
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 sm:gap-6">
          
          {/* Brand Logo Button -> Redirects to Role Workspace or Home */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => {
                onGoHome?.();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 text-left group"
            >
              <div className="w-11 h-11 bg-brand-navy rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md group-hover:scale-105 transition-transform">
                G
              </div>
              <div className="hidden sm:block">
                <div className="text-xl font-black text-brand-navy tracking-tight leading-none group-hover:text-brand-orange transition-colors">
                  Ghar-Tak
                </div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-brand-orange mt-0.5">
                  {userRole === 'ADMIN'
                    ? 'Admin Operator Portal'
                    : userRole === 'PROVIDER'
                    ? 'Partner Service Portal'
                    : 'Patna Home Services'}
                </div>
              </div>
            </button>

            {/* Location Selector (Customer & Guest only) */}
            {!isProfessionalUser && (
              <button
                onClick={() => setIsLocationOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-2xl text-xs font-semibold text-brand-navy transition-all max-w-[180px] sm:max-w-[240px] truncate group"
              >
                <MapPin className="w-4 h-4 text-brand-orange shrink-0 group-hover:bounce" />
                <span className="truncate">{currentLocation || 'Boring Road, Patna'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            )}
          </div>

          {/* Global Search Bar (Customer & Guest only) */}
          {!isProfessionalUser && (
            <div className="flex-1 max-w-xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for 'Electrician', 'Plumber', 'Carpenter', 'AC Repair'..."
                  value={searchValue}
                  onChange={handleSearchChange}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-brand-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
                />
              </div>
            </div>
          )}

          {/* Professional User Role Badge */}
          {isProfessionalUser && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-extrabold text-brand-navy">
              {userRole === 'ADMIN' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-brand-orange" />
                  <span>System Administrator Workspace</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Patna Service Partner Workspace</span>
                </>
              )}
            </div>
          )}

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!userSession && (
              <div className="hidden lg:flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                {(['customer', 'provider', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => onRoleChange(r)}
                    className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                      activeRole === r
                        ? 'bg-brand-navy text-white shadow-sm'
                        : 'text-slate-600 hover:text-brand-navy'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Notification Bell Icon */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2.5 text-slate-600 hover:text-brand-navy hover:bg-slate-100 rounded-2xl transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-orange text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              <NotificationPopover
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                onUnreadCountChange={setUnreadNotifications}
              />
            </div>

            {/* Cart Button (Customer & Guest only) */}
            {!isProfessionalUser && (
              <button
                onClick={onOpenCart}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 ? (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">
                    {cartCount} • ₹{cartTotal}
                  </span>
                ) : (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px]">0</span>
                )}
              </button>
            )}

            {/* Account Profile / Auth Button */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-brand-navy rounded-2xl text-xs font-bold transition-all border border-slate-200"
            >
              <User className="w-4 h-4 text-brand-navy" />
              <span className="hidden sm:inline truncate max-w-[100px]">
                {userSession?.user?.full_name ? userSession.user.full_name.split(' ')[0] : 'Sign In'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row (Customer & Guest only) */}
        {!isProfessionalUser && (
          <div className="px-4 pb-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchValue}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-brand-ink placeholder:text-slate-400 focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>
        )}
      </header>

      {!isProfessionalUser && (
        <LocationModal
          isOpen={isLocationOpen}
          onClose={() => setIsLocationOpen(false)}
          currentLocation={currentLocation}
          onSelectLocation={onSelectLocation}
        />
      )}
    </>
  );
};
