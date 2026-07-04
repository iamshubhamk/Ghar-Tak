import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";

import ghartakLogo from "./assets/ghartak-logo.jpg";
import { AuthPanel } from "./components/AuthPanel";
import { PublicHome } from "./components/PublicHome";
import { RoleDashboard } from "./components/RoleDashboard";
import { apiRequest } from "./lib/api";
import { apiBaseUrl } from "./lib/config";
import { User } from "./types/auth";

type HealthState = "checking" | "online" | "offline";
type AppView = "home" | "customer-auth" | "provider-auth" | "login";
const bookingIntentStorageKey = "ghartak_booking_intent_category";

function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>("home");
  const [pendingCategoryName, setPendingCategoryName] = useState<string | undefined>(() => {
    return sessionStorage.getItem(bookingIntentStorageKey) ?? undefined;
  });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
      .then((response) => {
        setHealth(response.ok ? "online" : "offline");
      })
      .catch(() => {
        setHealth("offline");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("ghartak_token");
    if (!token) {
      return;
    }

    apiRequest<User>("/auth/me")
      .then(setCurrentUser)
      .catch(() => {
        localStorage.removeItem("ghartak_token");
      });
  }, []);

  const logout = () => {
    localStorage.removeItem("ghartak_token");
    setCurrentUser(null);
    setView("home");
    setPendingCategoryName(undefined);
    sessionStorage.removeItem(bookingIntentStorageKey);
  };

  const goHome = () => {
    setView("home");
    setPendingCategoryName(undefined);
    sessionStorage.removeItem(bookingIntentStorageKey);
  };

  const startBookingIntent = (categoryName?: string) => {
    setPendingCategoryName(categoryName);
    if (categoryName) {
      sessionStorage.setItem(bookingIntentStorageKey, categoryName);
    } else {
      sessionStorage.removeItem(bookingIntentStorageKey);
    }
    setView("customer-auth");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand brand-button" onClick={goHome} type="button" aria-label="GharTak home">
          <span className="brand-mark">
            <img alt="" src={ghartakLogo} />
          </span>
          <span>
            <strong>GharTak</strong>
            <small>All Services at One Place</small>
          </span>
        </button>

        <nav className="top-actions" aria-label="Primary navigation">
          {!currentUser ? (
            <>
              <button
                className="nav-action"
                onClick={() => setView("customer-auth")}
                type="button"
              >
                Book a Service
              </button>
              <button
                className="nav-action"
                onClick={() => setView("provider-auth")}
                type="button"
              >
                Join as Provider
              </button>
              <button className="nav-action nav-action--icon" onClick={() => setView("login")} type="button">
                <LogIn size={16} aria-hidden="true" />
                Login
              </button>
            </>
          ) : null}
          <div className={`api-pill api-pill--${health}`}>
            <span />
            API {health}
          </div>
        </nav>
      </header>

      {currentUser ? (
        <RoleDashboard user={currentUser} onLogout={logout} pendingCategoryName={pendingCategoryName} />
      ) : null}

      {!currentUser && view === "home" ? (
        <PublicHome
          onBookService={startBookingIntent}
          onJoinProvider={() => setView("provider-auth")}
          onLogin={() => setView("login")}
        />
      ) : null}

      {!currentUser && view === "customer-auth" ? (
        <AuthPanel
          allowedModes={["customer", "login"]}
          heading="Book a service"
          initialMode="customer"
          onAuthenticated={setCurrentUser}
          subheading="Create a customer account or log in to search verified providers and request service."
        />
      ) : null}

      {!currentUser && view === "provider-auth" ? (
        <AuthPanel
          allowedModes={["provider", "login"]}
          heading="Join as provider"
          initialMode="provider"
          onAuthenticated={setCurrentUser}
          subheading="Register your service profile. Your account stays under review until admin approval."
        />
      ) : null}

      {!currentUser && view === "login" ? (
        <AuthPanel
          allowedModes={["login", "customer", "provider"]}
          heading="Login to GharTak"
          initialMode="login"
          onAuthenticated={setCurrentUser}
          subheading="Use your customer, provider, or admin credentials to continue."
        />
      ) : null}
    </main>
  );
}

export default App;
