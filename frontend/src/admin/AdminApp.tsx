import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Bell, LogOut } from "lucide-react";

import { NotificationPopover } from "../components/NotificationPopover";
import { apiRequest } from "../lib/api";
import { User } from "../types/auth";
import { MarketplaceAdminPanel } from "./MarketplaceAdminPanel";

type Session = "checking" | "denied" | User;

// Guard: a token alone is not enough; /auth/me must say ADMIN.
export default function AdminApp() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session>("checking");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("ghartak_token")) {
      setSession("denied");
      return;
    }
    apiRequest<User>("/auth/me")
      .then((user) => setSession(user.role === "ADMIN" ? user : "denied"))
      .catch(() => setSession("denied"));
  }, []);

  if (session === "denied") return <Navigate to="/admin/login" replace />;
  if (session === "checking") return <div className="p-8 text-sm font-semibold text-slate-500">Checking session…</div>;

  const logout = () => {
    localStorage.removeItem("ghartak_token");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-brand-navy text-white px-4 sm:px-8 py-3 flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="text-xs font-extrabold">{session.name}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Admin Account</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              title="Notifications"
              className="relative p-2 text-white hover:bg-white/10 rounded-xl"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-brand-orange text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
            <NotificationPopover
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
              onUnreadCountChange={setUnread}
            />
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold border border-white/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      <MarketplaceAdminPanel />
    </div>
  );
}
