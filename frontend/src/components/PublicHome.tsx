import React from 'react';
import { HeroCarousel } from './HeroCarousel';
import { CategoryGrid } from './CategoryGrid';
import { ServiceCarousel } from './ServiceCarousel';
import { TrustSection } from './TrustSection';
import { BriefcaseBusiness } from 'lucide-react';

interface PublicHomeProps {
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (name: string) => void;
  onBookService: (categoryName?: string) => void;
  onJoinProvider: () => void;
  onLogin: () => void;
  cartItems: Record<string, number>;
  onAddToCart: (service: any) => void;
  onRemoveFromCart: (id: string) => void;
}

const FEATURED_SERVICES = [
  {
    id: 'svc-1',
    name: 'Switchboard & Electrical Fitting',
    category: 'Electrician',
    price: 199,
    description: 'Safe replacement of switches, MCBs, sockets & wiring diagnostics.',
    duration: '30 mins',
    badge: 'Popular',
  },
  {
    id: 'svc-2',
    name: 'Tap Repair & Water Leakage Fix',
    category: 'Plumber',
    price: 249,
    description: 'Fix leaking taps, flush tanks, washbasin pipes & valve replacements.',
    duration: '45 mins',
    badge: 'In Demand',
  },
  {
    id: 'svc-3',
    name: 'AC Foam Jet Deep Wash',
    category: 'AC Repair',
    price: 499,
    description: 'Coil cleaning, filter wash & cooling inspection by experienced Patna pros.',
    duration: '45 mins',
    badge: 'Seasonal Best',
  },
  {
    id: 'svc-4',
    name: 'Full Bathroom Sanitation',
    category: 'House Cleaning',
    price: 699,
    description: 'Hard-water stain removal, floor scrub & sanitization in Patna homes.',
    duration: '60 mins',
    badge: 'Deep Clean',
  },
];

export const PublicHome: React.FC<PublicHomeProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onBookService,
  onJoinProvider,
  onLogin,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
}) => {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Banner Carousel */}
      <HeroCarousel onSelectCategory={onSelectCategory} />

      {/* Category Tiles Grid */}
      <CategoryGrid
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />

      {/* Popular Service Rate Cards */}
      <ServiceCarousel
        title="Standardized Service Cards in Patna"
        subtitle="Fixed rate cards with Cash on Service & 30-day warranty"
        services={FEATURED_SERVICES}
        cartItems={cartItems}
        onAddToCart={onAddToCart}
        onRemoveFromCart={onRemoveFromCart}
      />

      {/* Trust & Review Section */}
      <TrustSection onBookClick={() => onBookService()} />

      {/* Provider Onboarding Callout Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-gradient-to-r from-brand-navy via-slate-900 to-brand-navy-dark rounded-3xl p-8 sm:p-12 text-white shadow-floating flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="px-3.5 py-1 bg-white/10 text-brand-orange border border-white/10 rounded-full text-xs font-extrabold uppercase">
              Patna Partner Network
            </span>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Are you a skilled electrician, plumber, or technician in Patna?
            </h3>
            <p className="text-sm text-slate-300">
              Join Ghar-Tak partner network to get daily service requests, weekly payouts, and zero registration fee.
            </p>
          </div>

          <button
            onClick={onJoinProvider}
            className="px-8 py-4 bg-brand-orange hover:bg-brand-orange-hover text-white font-extrabold text-sm rounded-2xl shadow-xl transition-all hover:scale-105 shrink-0 flex items-center gap-2"
          >
            <BriefcaseBusiness className="w-5 h-5" />
            <span>Join as Patna Partner</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-navy border-t border-slate-800 py-12 text-slate-400 text-xs font-semibold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 bg-brand-orange rounded-xl flex items-center justify-center font-black text-sm">
              G
            </div>
            <div>
              <div className="font-extrabold text-base text-white">Ghar-Tak Patna Marketplace</div>
              <div className="text-[11px] text-slate-400">© 2026 Ghar-Tak Services Inc. All rights reserved.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button onClick={onLogin} className="hover:text-white transition-colors">
              Sign In
            </button>
            <button onClick={onJoinProvider} className="hover:text-white transition-colors">
              Provider Portal
            </button>
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
