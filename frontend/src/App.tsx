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
  category?: string;
}

function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>("home");
  const [showSplash, setShowSplash] = useState(true);
  const [currentLocation, setCurrentLocation] = useState("Boring Road, Patna");
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
      .then((user) => {
        setCurrentUser(user);
        // Automatically land Admin & Provider users in their dedicated dashboard workspace
        if (user.role === "ADMIN" || user.role === "PROVIDER") {
          setView("dashboard");
        }
      })
      .catch(() => {
        localStorage.removeItem("ghartak_token");
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const logout = () => {
    localStorage.removeItem("ghartak_token");
    setCurrentUser(null);
    setView("home");
    setPendingCategoryName(undefined);
    sessionStorage.removeItem(bookingIntentStorageKey);
  };

  // Role-Dedicated Home / Logo Navigation Logic
  const goHome = () => {
    if (currentUser?.role === "ADMIN" || currentUser?.role === "PROVIDER") {
      setView("dashboard"); // Providers and Admins return to operational workspace
    } else {
      setView("home"); // Customers and Guests return to consumer booking homepage
    }
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
    // Enforce single-category cart to ensure 1 booking = 1 technician trade
    if (cartItems.length > 0 && service.category) {
      const existingCategory = cartItems.find((i) => i.category)?.category;
      if (existingCategory && existingCategory.toLowerCase() !== service.category.toLowerCase()) {
        const confirmClear = window.confirm(
          `Your cart already contains ${existingCategory} services. Would you like to clear your cart and start a new order for ${service.category}?`
        );
        if (!confirmClear) return;
        setCartItems([
          {
            id: service.id,
            name: service.name,
            price: service.price || 199,
            quantity: 1,
            category: service.category,
          },
        ]);
        return;
      }
    }

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
          price: service.price || 199,
          quantity: 1,
          category: service.category,
        },
      ];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const cartRecord = cartItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = item.quantity;
    return acc;
  }, {});

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const submitCartBooking = async (details: any) => {
    try {
      const categories = await apiRequest<any[]>("/categories");
      const primaryCategoryName = details.items?.[0]?.category || selectedCategory || "General";
      const matchedCategory =
        categories.find((c: any) => c.name.toLowerCase() === primaryCategoryName.toLowerCase()) ||
        categories[0];

      if (!matchedCategory) {
        setView("dashboard");
        return;
      }

      const payload = {
        category_id: matchedCategory.id,
        locality: details.locality || currentLocation || "Boring Road, Patna",
        address: details.address || details.locality || "Boring Road, Patna",
        house_number: details.house_number || null,
        building_name: details.building_name || null,
        landmark: details.landmark || null,
        pincode: details.pincode || "800001",
        preferred_datetime: details.date || new Date().toISOString(),
        items: details.items || [],
        subtotal: details.subtotal || details.amount,
        platform_fee: details.platform_fee || 0,
        discount: details.discount || 0,
        total_amount: details.amount,
        issue_description:
          details.items?.map((i: any) => `${i.name} (x${i.quantity})`).join(", ") || "Home Service Booking",
      };

      await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCartItems([]);
      sessionStorage.removeItem("ghartak_pending_cart");
      setView("dashboard");
    } catch (err) {
      console.error("Failed to submit cart booking", err);
      setView("dashboard");
    }
  };

  const handleConfirmBookingFromDrawer = async (details: any) => {
    setIsDrawerOpen(false);
    if (!currentUser) {
      sessionStorage.setItem("ghartak_pending_cart", JSON.stringify(details));
      setView("customer-auth");
    } else {
      await submitCartBooking(details);
    }
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    const pendingCartStr = sessionStorage.getItem("ghartak_pending_cart");
    if (pendingCartStr && user.role === "CUSTOMER") {
      try {
        const details = JSON.parse(pendingCartStr);
        await submitCartBooking(details);
        return;
      } catch (e) {
        sessionStorage.removeItem("ghartak_pending_cart");
      }
    }
    setView("dashboard");
  };

  const handleRoleChange = (role: 'customer' | 'provider' | 'admin') => {
    setActiveRole(role);
    if (role === 'customer') {
      setView(currentUser ? "dashboard" : "customer-auth");
    } else if (role === 'provider') {
      setView(currentUser ? "dashboard" : "provider-auth");
    } else if (role === 'admin') {
      setView(currentUser && currentUser.role === 'ADMIN' ? "dashboard" : "login");
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

      {/* Role-Tailored Navigation Header */}
      <Header
        currentLocation={currentLocation}
        onSelectLocation={setCurrentLocation}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onOpenCart={() => setIsDrawerOpen(true)}
        onSearch={setSearchQuery}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        userSession={currentUser ? { user: { full_name: currentUser.name } } : null}
        userRole={currentUser?.role ?? null}
        onOpenAuth={() => (currentUser ? setView("dashboard") : setView("login"))}
        onGoHome={goHome}
      />

      {/* Page Routing Views */}
      {currentUser && view === "dashboard" ? (
        <RoleDashboard
          user={currentUser}
          onLogout={logout}
          pendingCategoryName={pendingCategoryName}
        />
      ) : null}

      {view === "home" && (!currentUser || currentUser.role === "CUSTOMER") ? (
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
          heading="Book a service in Patna"
          initialMode="customer"
          onAuthenticated={handleAuthSuccess}
          subheading="Create a customer account or log in to search verified Patna service partners."
        />
      ) : null}

      {!currentUser && view === "provider-auth" ? (
        <AuthPanel
          allowedModes={["provider", "login"]}
          heading="Join as Patna service partner"
          initialMode="provider"
          onAuthenticated={handleAuthSuccess}
          subheading="Register your technician profile in Patna. Account stays under verification until admin approval."
        />
      ) : null}

      {!currentUser && view === "login" ? (
        <AuthPanel
          allowedModes={["login", "customer", "provider"]}
          heading="Login to GharTak"
          initialMode="login"
          onAuthenticated={handleAuthSuccess}
          subheading="Enter your email and password to access your Customer, Provider, or Admin dashboard."
        />
      ) : null}

      {/* Service Drawer (Customer & Guest only) */}
      {(!currentUser || currentUser.role === "CUSTOMER") && (
        <ServiceDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onClearCart={() => setCartItems([])}
          currentLocation={currentLocation}
          onConfirmBooking={handleConfirmBookingFromDrawer}
        />
      )}
    </main>
  );
}

export default App;
