import { BriefcaseBusiness, CheckCircle2, Home, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthPanel } from "./components/AuthPanel";
import { apiBaseUrl } from "./lib/config";

type HealthState = "checking" | "online" | "offline";

const serviceCategories = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "AC Repair",
  "Appliance Repair",
  "House Cleaning"
];

function App() {
  const [health, setHealth] = useState<HealthState>("checking");

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

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="GharTak home">
          <span className="brand-mark">
            <Home size={24} aria-hidden="true" />
          </span>
          <span>
            <strong>GharTak</strong>
            <small>All Services at One Place</small>
          </span>
        </a>

        <div className={`api-pill api-pill--${health}`}>
          <span />
          API {health}
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Patna-first service marketplace</p>
          <h1>Verified local services, ghar tak.</h1>
          <p className="lead">
            Book trusted electricians, plumbers, repair technicians, cleaners, and more from your area.
          </p>

          <div className="hero-actions">
            <button className="primary-action" type="button">
              <Wrench size={18} aria-hidden="true" />
              Book a Service
            </button>
            <button className="secondary-action" type="button">
              <BriefcaseBusiness size={18} aria-hidden="true" />
              Join as Provider
            </button>
          </div>
        </div>

        <div className="trust-panel" aria-label="MVP launch priorities">
          <div>
            <ShieldCheck size={22} aria-hidden="true" />
            <span>Manual provider verification</span>
          </div>
          <div>
            <CheckCircle2 size={22} aria-hidden="true" />
            <span>Cash on Service first</span>
          </div>
          <div>
            <Home size={22} aria-hidden="true" />
            <span>Focused on Patna localities</span>
          </div>
        </div>
      </section>

      <section className="category-section" aria-labelledby="categories-heading">
        <div className="section-heading">
          <p className="eyebrow">MVP categories</p>
          <h2 id="categories-heading">Start with high-demand home services</h2>
        </div>

        <div className="category-grid">
          {serviceCategories.map((category) => (
            <button className="category-tile" key={category} type="button">
              <Wrench size={20} aria-hidden="true" />
              <span>{category}</span>
            </button>
          ))}
        </div>
      </section>

      <AuthPanel />
    </main>
  );
}

export default App;
