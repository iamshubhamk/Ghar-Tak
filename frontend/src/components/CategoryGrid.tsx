import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench,
  Sparkles,
  Scissors,
  Home,
  Paintbrush,
  Zap,
  CheckCircle,
  TrendingUp,
  Star,
} from 'lucide-react';

interface CategoryGridProps {
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (name: string) => void;
}

const DEFAULT_CATEGORY_ICONS: Record<string, { icon: any; color: string; bg: string; badge: string }> = {
  'AC & Appliance Repair': {
    icon: Wrench,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    badge: 'Flat ₹150 OFF',
  },
  'Cleaning & Pest Control': {
    icon: Home,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    badge: 'Top Rated 4.9★',
  },
  'Plumbing & Electrician': {
    icon: Zap,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    badge: 'In 30 Mins',
  },
  'Painting & Waterproofing': {
    icon: Paintbrush,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    badge: 'Free Consultation',
  },
  'Salon & Beauty for Women': {
    icon: Sparkles,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    badge: 'Luxury Pros',
  },
  'Men’s Salon & Grooming': {
    icon: Scissors,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    badge: 'Trending',
  },
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Most Popular', 'Repairs & Fixes', 'Cleaning'];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-orange mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Marketplace Categories</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-brand-navy tracking-tight">
            What are you looking for today?
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeFilter === f
                  ? 'bg-brand-navy text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tile Grid (Urban Company Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
        {categories.map((cat, idx) => {
          const config = DEFAULT_CATEGORY_ICONS[cat.name] || {
            icon: Wrench,
            color: 'text-brand-orange',
            bg: 'bg-orange-50',
            badge: 'Popular',
          };
          const IconComp = config.icon;
          const isSelected = selectedCategory === cat.name;

          return (
            <motion.button
              key={cat.id || idx}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectCategory(cat.name)}
              className={`relative flex flex-col items-center p-5 rounded-3xl border transition-all text-center group ${
                isSelected
                  ? 'bg-orange-50/80 border-brand-orange shadow-md ring-2 ring-brand-orange/20'
                  : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-card hover:shadow-soft'
              }`}
            >
              {/* Badge */}
              <span className="absolute -top-2.5 px-2.5 py-0.5 bg-brand-navy text-white text-[10px] font-extrabold rounded-full shadow-sm">
                {config.badge}
              </span>

              {/* Icon Container */}
              <div className={`w-14 h-14 ${config.bg} rounded-2xl flex items-center justify-center mb-3 mt-1 group-hover:scale-110 transition-transform duration-300`}>
                <IconComp className={`w-7 h-7 ${config.color}`} />
              </div>

              {/* Name */}
              <div className="font-extrabold text-sm text-brand-navy group-hover:text-brand-orange transition-colors leading-tight mb-1">
                {cat.name}
              </div>

              {/* Sub-text */}
              <div className="text-[11px] font-semibold text-slate-400">
                {cat.service_count || '12+'} options
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

