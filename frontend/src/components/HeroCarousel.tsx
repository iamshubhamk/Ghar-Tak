import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface HeroCarouselProps {
  onSelectCategory?: (category: string) => void;
}

const HERO_SLIDES = [
  {
    id: 1,
    title: 'Electrician & Repairs in Patna',
    subtitle: 'Switchboard fixes, MCBs, wiring & appliance repair at your doorstep.',
    tag: '⚡ On-Demand Service',
    valueProp: 'Verified Patna Technicians',
    bgGradient: 'from-brand-navy via-brand-navy-soft to-slate-900',
    accentColor: 'text-brand-orange',
    cta: 'Book Electrician',
    categoryName: 'Electrician',
  },
  {
    id: 2,
    title: 'Plumbing & Water Leak Fixes',
    subtitle: 'Tap replacements, pipe repairs & bathroom fitting by verified local pros.',
    tag: '🔧 Fixed Rate Cards',
    valueProp: 'Cash on Service First',
    bgGradient: 'from-slate-900 via-indigo-950 to-brand-navy',
    accentColor: 'text-amber-400',
    cta: 'Book Plumber',
    categoryName: 'Plumber',
  },
  {
    id: 3,
    title: 'AC Service & Deep Cleaning',
    subtitle: 'Foam jet wash, cooling inspection & gas leak checks in Patna localities.',
    tag: '❄️ Seasonal Care',
    valueProp: '30-Day Workmanship Guarantee',
    bgGradient: 'from-brand-navy-dark via-slate-900 to-orange-950',
    accentColor: 'text-brand-orange',
    cta: 'Book AC Service',
    categoryName: 'AC Repair',
  },
];

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ onSelectCategory }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="relative overflow-hidden rounded-3xl shadow-floating min-h-[360px] sm:min-h-[420px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient}`}
          >
            <div className="absolute right-0 top-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-orange/20 via-transparent to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 p-6 sm:p-12 max-w-2xl text-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-extrabold uppercase tracking-wide text-brand-orange">
                  {slide.tag}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {slide.valueProp}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
                {slide.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-200 font-medium max-w-xl">
                {slide.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => onSelectCategory?.(slide.categoryName)}
                  className="flex items-center gap-2.5 px-6 py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <span>{slide.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Patna Verified Pros</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          <div className="flex gap-1.5 mr-2">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === idx ? 'w-7 bg-brand-orange' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
