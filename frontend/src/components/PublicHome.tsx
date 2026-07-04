import {
  BriefcaseBusiness,
  CheckCircle2,
  Headphones,
  Home,
  ShieldCheck,
  Star,
  Users,
  Wrench
} from "lucide-react";

import { defaultServices } from "../lib/defaultServices";

type PublicHomeProps = {
  onBookService: (categoryName?: string) => void;
  onJoinProvider: () => void;
  onLogin: () => void;
};

const showcaseItems = [
  {
    title: "Verified local services",
    body: "Find nearby providers for essential home services in Patna.",
    icon: Wrench
  },
  {
    title: "Happy customers",
    body: "Simple booking, clear status, and cash on service for MVP.",
    icon: Star
  },
  {
    title: "GharTak operations",
    body: "Provider verification and admin oversight keep trust at the center.",
    icon: Users
  }
];

export function PublicHome({ onBookService, onJoinProvider, onLogin }: PublicHomeProps) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Patna-first service marketplace</p>
          <h1>Verified local services, ghar tak.</h1>
          <p className="lead">
            Book trusted electricians, plumbers, repair technicians, cleaners, tutors, drivers,
            and event helpers from your area.
          </p>

          <div className="hero-actions">
            <button className="primary-action" onClick={() => onBookService()} type="button">
              <Wrench size={18} aria-hidden="true" />
              Book a Service
            </button>
            <button className="secondary-action" onClick={onJoinProvider} type="button">
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
          <p className="eyebrow">Services</p>
          <h2 id="categories-heading">Choose the work you need done</h2>
        </div>

        <div className="category-grid">
          {defaultServices.map((service) => (
            <button
              className="category-tile"
              key={service.name}
              onClick={() => onBookService(service.name)}
              type="button"
            >
              <Wrench size={20} aria-hidden="true" />
              <span>{service.name}</span>
              <small>{service.priceLabel}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="showcase-section" aria-labelledby="showcase-heading">
        <div className="section-heading">
          <p className="eyebrow">Why GharTak</p>
          <h2 id="showcase-heading">Built for local trust before scale</h2>
        </div>
        <div className="showcase-grid">
          {showcaseItems.map((item) => {
            const Icon = item.icon;
            return (
              <article className="showcase-panel" key={item.title}>
                <Icon size={28} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>GharTak</strong>
          <span>All Services at One Place</span>
        </div>
        <div>
          <Headphones size={18} aria-hidden="true" />
          <span>Contact: 8102909835</span>
        </div>
        <button className="secondary-action" onClick={onLogin} type="button">
          Login
        </button>
      </footer>
    </>
  );
}
