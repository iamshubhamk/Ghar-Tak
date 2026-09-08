import { LogOut } from "lucide-react";
import { User } from "../types/auth";
import { CustomerDashboard } from "./CustomerDashboard";
import { MarketplaceAdminPanel } from "./MarketplaceAdminPanel";
import { ProviderBookingsPanel } from "./ProviderBookingsPanel";

type RoleDashboardProps = {
  user: User;
  onLogout: () => void;
  pendingCategoryName?: string;
};

export function RoleDashboard({ user, onLogout, pendingCategoryName }: RoleDashboardProps) {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Session Action Bar */}
      <div className="bg-brand-navy text-white px-4 sm:px-8 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white font-black text-xs flex items-center justify-center">
            {user.name ? user.name[0] : 'U'}
          </div>
          <div>
            <div className="text-xs font-extrabold">{user.name}</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{user.role} Account</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold transition-all border border-white/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {user.role === "CUSTOMER" && <CustomerDashboard pendingCategoryName={pendingCategoryName} />}
      {user.role === "PROVIDER" && <ProviderBookingsPanel />}
      {user.role === "ADMIN" && <MarketplaceAdminPanel />}
    </div>
  );
}
