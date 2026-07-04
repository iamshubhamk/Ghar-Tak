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

import acMechanic from "../../static/AC Mechanic.png";
import carpenter from "../../static/Carpenter.png";
import electrician from "../../static/Electrician.png";
import painter from "../../static/Painter.png";
import plumber from "../../static/Plumber.png";

const marqueeImages = [acMechanic, carpenter, electrician, painter, plumber];

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

      <section className="showcase-section" aria-labelledby="showcase-heading">
        <div className="section-heading">
          <p className="eyebrow">Why GharTak</p>
          <h2 id="showcase-heading">Built for local trust before scale</h2>
        </div>
        <div className="marquee-container">
          <div className="marquee-track">
            {marqueeImages.map((src, idx) => (
              <img key={`track1-${idx}`} src={src} alt="GharTak Service" />
            ))}
          </div>
          <div className="marquee-track">
            {marqueeImages.map((src, idx) => (
              <img key={`track2-${idx}`} src={src} alt="GharTak Service" />
            ))}
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

      <footer className="site-footer">
        <div>
          <strong>GharTak</strong>
          <span>All Services at One Place</span>
        </div>
        <button className="secondary-action" onClick={onLogin} type="button">
          Login
        </button>
      </footer>
    </>
  );
}
