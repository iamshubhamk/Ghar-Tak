import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Compass, CheckCircle2, AlertCircle } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onSelectLocation: (location: string) => void;
}

const PATNA_LOCALITIES = [
  'Boring Road, Patna',
  'Kankarbagh, Patna',
  'Bailey Road, Patna',
  'Patliputra Colony, Patna',
  'Fraser Road, Patna',
  'Danapur, Patna',
  'Rajendra Nagar, Patna',
  'Anisabad, Patna',
];

const OTHER_CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Kolkata',
  'Hyderabad',
  'Pune',
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);

  const handleDetectLocation = () => {
    setIsDetecting(true);
    setDetectStatus('Detecting GPS location...');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          // Patna approx bounding box: lat 25.4 to 25.7, lon 85.0 to 85.3
          const isPatna = latitude >= 25.3 && latitude <= 25.8 && longitude >= 84.9 && longitude <= 85.4;
          
          setTimeout(() => {
            setIsDetecting(false);
            setDetectStatus(null);
            if (isPatna) {
              onSelectLocation('Boring Road, Patna (GPS Detected)');
            } else {
              onSelectLocation(`GPS Detected Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
            }
            onClose();
          }, 600);
        },
        () => {
          setDetectStatus('Location permission denied. Defaulting to Patna.');
          setIsDetecting(false);
          onSelectLocation('Boring Road, Patna');
          onClose();
        }
      );
    } else {
      setDetectStatus('Geolocation not supported by browser.');
      setIsDetecting(false);
    }
  };

  const filteredPatna = PATNA_LOCALITIES.filter((loc) =>
    loc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOther = OTHER_CITIES.filter((city) =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-floating overflow-hidden z-10 border border-slate-200"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 rounded-2xl text-brand-orange">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-navy">Select Service Location</h3>
                  <p className="text-xs font-bold text-brand-orange uppercase tracking-wider">
                    Ghar-Tak is Live in Patna
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Patna locality or pincode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-brand-ink placeholder:text-slate-400 focus:outline-none focus:border-brand-orange transition-all"
                />
              </div>

              <button
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="w-full flex items-center justify-between p-4 bg-orange-50/60 hover:bg-orange-50 border border-orange-100 rounded-2xl text-brand-navy font-semibold transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Compass className={`w-5 h-5 text-brand-orange ${isDetecting ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'}`} />
                  <div className="text-left">
                    <div className="font-bold text-brand-navy">Detect Current GPS Location</div>
                    <div className="text-xs text-slate-500">Auto-detect location via browser</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-orange bg-white px-3 py-1.5 rounded-full shadow-sm">
                  Auto Detect
                </span>
              </button>

              {detectStatus && (
                <div className="text-xs text-center text-brand-orange font-bold">
                  {detectStatus}
                </div>
              )}

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Patna Localities (Active Service Area)</span>
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {filteredPatna.map((loc) => {
                    const isSelected = currentLocation.toLowerCase().includes(loc.toLowerCase());
                    return (
                      <button
                        key={loc}
                        onClick={() => {
                          onSelectLocation(loc);
                          onClose();
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-extrabold transition-all text-left ${
                          isSelected
                            ? 'border-brand-orange bg-orange-50 text-brand-navy shadow-sm'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{loc}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Other Cities (Expanding Soon)</span>
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {filteredOther.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        onSelectLocation(`${city} (Outside Service Area)`);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-500 text-center truncate"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
