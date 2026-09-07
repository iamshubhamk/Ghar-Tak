import React from 'react';
import { ShieldCheck, Award, HeartHandshake, Headphones, Star, Quote } from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    name: 'Priya Sharma',
    city: 'South Delhi',
    rating: 5,
    service: 'AC Deep Foam Cleaning',
    comment: 'The technician arrived exactly on time with full safety gear. The AC is cooling like brand new!',
  },
  {
    id: 2,
    name: 'Rahul Verma',
    city: 'Bengaluru',
    rating: 5,
    service: 'Full Bathroom Deep Cleaning',
    comment: 'Impressed by the professional tools used. Very polite partner and completely mess-free execution.',
  },
  {
    id: 3,
    name: 'Ananya Gupta',
    city: 'Mumbai',
    rating: 5,
    service: 'Electrical Switchboard Fix',
    comment: 'Booked at 10 AM, electrician reached by 10:25 AM. Quick, affordable, and transparent invoice.',
  },
];

export const TrustSection: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-14 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        
        {/* Safety & Trust Pillars */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-navy tracking-tight">
              Why 500,000+ homes trust Ghar-Tak
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-2">
              High quality, standardized home services at your doorstep.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-card flex items-start gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-brand-navy text-base mb-1">Background Checked</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Every service partner undergoes strict police verification and skill assessment.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-card flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-brand-navy text-base mb-1">30-Day Guarantee</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Free re-service if you are not 100% satisfied with the work done.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-card flex items-start gap-4">
              <div className="p-3 bg-orange-50 text-brand-orange rounded-2xl shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-brand-navy text-base mb-1">Transparent Pricing</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No hidden charges. Standardized fixed rate cards for every service.
                </p>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-card flex items-start gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-brand-navy text-base mb-1">24x7 Customer Support</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dedicated helpline & instant live chat for any booking assistance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Review Cards */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-brand-navy tracking-tight">
                Real Customer Reviews
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Rated 4.8 / 5 based on 100,000+ completed jobs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((rev) => (
              <div
                key={rev.id}
                className="p-6 bg-white rounded-3xl border border-slate-200 shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1 text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <Quote className="w-6 h-6 text-slate-200" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-xs text-brand-navy">{rev.name}</div>
                    <div className="text-[11px] font-semibold text-slate-400">{rev.city}</div>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                    {rev.service}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

