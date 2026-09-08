import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Snowflake,
  Wrench,
  Sparkles,
  Car,
  GraduationCap,
  Users,
  MoreHorizontal,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CategoryGridProps {
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (name: string) => void;
}

// Map each service category to a unique icon, color, and filter type
const CATEGORY_ICON_MAP: Record<string, { icon: any; color: string; bg: string; type: string; isPopular?: boolean; badge?: string }> = {
  'Electrician': {
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    type: 'Repairs & Fixes',
    isPopular: true,
    badge: 'Top Rated',
  },
  'Plumber': {
    icon: Droplets,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    type: 'Repairs & Fixes',
    isPopular: true,
    badge: 'Popular',
  },
  'Carpenter': {
    icon: Hammer,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    type: 'Repairs & Fixes',
    isPopular: true,
    badge: 'In Demand',
  },
  'Painter': {
    icon: Paintbrush,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    type: 'Repairs & Fixes',
    isPopular: false,
  },
  'AC Repair': {
    icon: Snowflake,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    type: 'Repairs & Fixes',
    isPopular: true,
    badge: 'Trending',
  },
  'Appliance Repair': {
    icon: Wrench,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    type: 'Repairs & Fixes',
    isPopular: false,
  },
  'House Cleaning': {
    icon: Sparkles,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    type: 'Cleaning',
    isPopular: true,
  },
  'Driver': {
    icon: Car,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    type: 'Other',
    isPopular: false,
  },
  'Tutor': {
    icon: GraduationCap,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    type: 'Other',
    isPopular: false,
  },
  'Event Staff': {
    icon: Users,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    type: 'Other',
    isPopular: false,
  },
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [isExpanded, setIsExpanded] = useState(false);

  const filters = ['All', 'Most Popular', 'Repairs & Fixes', 'Cleaning'];

  // Filter categories dynamically based on selected tab
  const filteredCategories = categories.filter((cat) => {
    const config = CATEGORY_ICON_MAP[cat.name] || { type: 'Other', isPopular: false };
    if (activeFilter === 'Most Popular') return config.isPopular;
    if (activeFilter === 'Repairs & Fixes') return config.type === 'Repairs & Fixes';
    if (activeFilter === 'Cleaning') return config.type === 'Cleaning';
    return true; // 'All'
  });

  // Limit display to top 6 if not expanded and filter is 'All'
  const displayedCategories = (activeFilter === 'All' && !isExpanded)
    ? filteredCategories.slice(0, 6)
    : filteredCategories;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-orange mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Patna Local Services</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-brand-navy tracking-tight">
            What work do you need done today?
          </h2>
        </div>

        {/* Working Active Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => {
                setActiveFilter(f);
                setIsExpanded(true); // Auto expand when filter is selected
              }}
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

      {/* Category Tile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
        {displayedCategories.map((cat, idx) => {
          const config = CATEGORY_ICON_MAP[cat.name] || {
            icon: MoreHorizontal,
            color: 'text-slate-600',
            bg: 'bg-slate-50',
            type: 'Other',
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
              {/* Only show badge if explicitly configured */}
              {config.badge && (
                <span className="absolute -top-2.5 px-2.5 py-0.5 bg-brand-orange text-white text-[10px] font-extrabold rounded-full shadow-sm">
                  {config.badge}
                </span>
              )}

              {/* Unique Category Icon Container */}
              <div className={`w-14 h-14 ${config.bg} rounded-2xl flex items-center justify-center mb-3 mt-1 group-hover:scale-110 transition-transform duration-300`}>
                <IconComp className={`w-7 h-7 ${config.color}`} />
              </div>

              {/* Category Name */}
              <div className="font-extrabold text-sm text-brand-navy group-hover:text-brand-orange transition-colors leading-tight mb-1">
                {cat.name}
              </div>

              {/* Sub-text */}
              <div className="text-[11px] font-semibold text-slate-400">
                {cat.priceLabel || 'Verified Patna Pros'}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* View All / Show Less Expand Toggle */}
      {activeFilter === 'All' && categories.length > 6 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-extrabold text-brand-navy shadow-sm transition-all"
          >
            <span>{isExpanded ? 'Show Popular Only' : `View All Services (${categories.length})`}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-brand-orange" /> : <ChevronDown className="w-4 h-4 text-brand-orange" />}
          </button>
        </div>
      )}
    </section>
  );
};
