import { useEffect, useState } from "react";
import ghartakLogo from "./assets/ghartak-logo.jpg";
import { AuthPanel } from "./components/AuthPanel";
import { PublicHome } from "./components/PublicHome";
import { RoleDashboard } from "./components/RoleDashboard";
import { Header } from "./components/Header";
import { ServiceDrawer } from "./components/ServiceDrawer";
import { apiRequest } from "./lib/api";
import { apiBaseUrl } from "./lib/config";
import { User } from "./types/auth";
import { defaultServices } from "./lib/defaultServices";

type HealthState = "checking" | "online" | "offline";
type AppView = "home" | "customer-auth" | "provider-auth" | "login" | "dashboard";
const bookingIntentStorageKey = "ghartak_booking_intent_category";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>("home");
  const [showSplash, setShowSplash] = useState(true);
  const [currentLocation, setCurrentLocation] = useState("Connaught Place, New Delhi");
  const [activeRole, setActiveRole] = useState<'customer' | 'provider' | 'admin'>('customer');
  
  // Cart & Service Drawer State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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
    if (!token) return;

    apiRequest<User>("/auth/me")
      .then(setCurrentUser)
      .catch(() => {
        localStorage.removeItem("ghartak_token");
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
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
    if (currentUser) {
      setView("dashboard");
    } else {
      setView("customer-auth");
    }
  };

  // Cart Helper functions
  const handleAddToCart = (service: any) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: service.id,
          name: service.name,
          price: service.price || 499,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const cartRecord = cartItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = item.quantity;
    return acc;
  }, {});

  const handleConfirmBookingFromDrawer = (details: any) => {
    setIsDrawerOpen(false);
    if (!currentUser) {
      setView("customer-auth");
    } else {
      setView("dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-brand-ink">
      {showSplash && (
        <div className="splash-overlay">
          <div className="splash-logo-container">
            <img className="splash-logo" src={ghartakLogo} alt="GharTak Logo" />
          </div>
        </div>
      )}

      {/* Urban Company Sticky Navigation Header */}
      <Header
        currentLocation={currentLocation}
        onSelectLocation={setCurrentLocation}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsDrawerOpen(true)}
        onSearch={setSearchQuery}
        activeRole={activeRole}
        onRoleChange={(r: 'customer' | 'provider' | 'admin') => setActiveRole(r)}
        userSession={currentUser ? { user: { full_name: currentUser.name } } : null}
        onOpenAuth={() => (currentUser ? setView("dashboard") : setView("login"))}
      />

      {/* Page Routing Views */}
      {currentUser && view === "dashboard" ? (
        <RoleDashboard
          user={currentUser}
          onLogout={logout}
          pendingCategoryName={pendingCategoryName}
        />
      ) : null}

      {view === "home" ? (
        <PublicHome
          categories={defaultServices}
          selectedCategory={selectedCategory}
          onSelectCategory={(name) => {
            setSelectedCategory(name);
            startBookingIntent(name);
          }}
          onBookService={startBookingIntent}
          onJoinProvider={() => setView("provider-auth")}
          onLogin={() => setView("login")}
          cartItems={cartRecord}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={(id) => handleUpdateQuantity(id, -1)}
        />
      ) : null}

      {!currentUser && view === "customer-auth" ? (
        <AuthPanel
          allowedModes={["customer", "login"]}
          heading="Book a service"
          initialMode="customer"
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setView("dashboard");
          }}
          subheading="Create a customer account or log in to search verified providers and request service."
        />
      ) : null}

      {!currentUser && view === "provider-auth" ? (
        <AuthPanel
          allowedModes={["provider", "login"]}
          heading="Join as provider"
          initialMode="provider"
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setView("dashboard");
          }}
          subheading="Register your service profile. Your account stays under review until admin approval."
        />
      ) : null}

      {!currentUser && view === "login" ? (
        <AuthPanel
          allowedModes={["login", "customer", "provider"]}
          heading="Login to GharTak"
          initialMode="login"
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setView("dashboard");
          }}
          subheading="Use your customer, provider, or admin credentials to continue."
        />
      ) : null}

      {/* Urban Company Dynamic Service Drawer */}
      <ServiceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={() => setCartItems([])}
        currentLocation={currentLocation}
        onConfirmBooking={handleConfirmBookingFromDrawer}
      />
    </main>
  );
}

export default App;
