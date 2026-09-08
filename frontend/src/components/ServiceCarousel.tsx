import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Minus, Flame, ShieldCheck } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  rating?: number;
  reviewCount?: number;
  duration?: string;
  badge?: string;
}

interface ServiceCarouselProps {
  title: string;
  subtitle?: string;
  services: ServiceItem[];
  cartItems: Record<string, number>;
  onAddToCart: (service: ServiceItem) => void;
  onRemoveFromCart: (serviceId: string) => void;
}

export const ServiceCarousel: React.FC<ServiceCarouselProps> = ({
  title,
  subtitle,
  services,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
}) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-orange mb-1">
          <Flame className="w-4 h-4 fill-brand-orange text-brand-orange" />
          <span>Popular Services in Patna</span>
        </div>
        <h3 className="text-2xl font-black text-brand-navy tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm font-semibold text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex gap-5 overflow-x-auto pb-6 pt-2 no-scrollbar">
        {services.map((svc) => {
          const qty = cartItems[svc.id] || 0;
          return (
            <motion.div
              key={svc.id}
              whileHover={{ y: -4 }}
              className="min-w-[280px] sm:min-w-[320px] max-w-[340px] bg-white rounded-3xl border border-slate-200 p-5 shadow-card hover:shadow-soft flex flex-col justify-between shrink-0 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 bg-orange-50 border border-orange-100 text-brand-orange text-[10px] font-extrabold rounded-full">
                    {svc.badge || 'Patna Rate Card'}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Pro</span>
                  </div>
                </div>

                <h4 className="font-extrabold text-base text-brand-navy leading-snug mb-1">
                  {svc.name}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                  {svc.description}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{svc.duration || '30-45 mins'}</span>
                  </div>
                  <span>•</span>
                  <span className="text-slate-500 font-bold">Cash on Service</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Service Rate
                  </div>
                  <div className="text-xl font-black text-brand-navy">
                    {svc.price > 0 ? `₹${svc.price}` : 'Inspection Quote'}
                  </div>
                </div>

                {qty === 0 ? (
                  <button
                    onClick={() => onAddToCart(svc)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 hover:bg-brand-orange text-brand-orange hover:text-white border border-orange-200 hover:border-brand-orange rounded-2xl text-xs font-extrabold transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                ) : (
                  <div className="flex items-center bg-brand-navy text-white rounded-2xl p-1 shadow-md">
                    <button
                      onClick={() => onRemoveFromCart(svc.id)}
                      className="p-1 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 font-extrabold text-xs">{qty}</span>
                    <button
                      onClick={() => onAddToCart(svc)}
                      className="p-1 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
