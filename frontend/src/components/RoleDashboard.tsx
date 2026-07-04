import { LogOut } from "lucide-react";

import { User } from "../types/auth";
import { CustomerDashboard } from "./CustomerDashboard";
import { MarketplaceAdminPanel } from "./MarketplaceAdminPanel";
import { ProviderBookingsPanel } from "./ProviderBookingsPanel";
import { ProviderOnboardingPanel } from "./ProviderOnboardingPanel";

type RoleDashboardProps = {
  user: User;
  onLogout: () => void;
  pendingCategoryName?: string;
};

export function RoleDashboard({ user, onLogout, pendingCategoryName }: RoleDashboardProps) {
  return (
    <>
      <section className="session-strip">
        <div>
          <span>Signed in as</span>
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </div>
        <button className="secondary-action" onClick={onLogout} type="button">
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </section>

      {user.role === "CUSTOMER" ? (
        <CustomerDashboard pendingCategoryName={pendingCategoryName} />
      ) : null}
      {user.role === "PROVIDER" ? (
        <>
          <ProviderOnboardingPanel />
          <ProviderBookingsPanel />
        </>
      ) : null}
      {user.role === "ADMIN" ? <MarketplaceAdminPanel /> : null}
    </>
  );
}
