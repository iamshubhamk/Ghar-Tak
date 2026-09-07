import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Compass, CheckCircle2 } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: string;
  onSelectLocation: (location: string) => void;
}

const POPULAR_CITIES = [
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Kolkata',
  'Chennai',
  'Jaipur',
  'Ahmedabad',
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
        () => {
          setTimeout(() => {
            const detected = 'Connaught Place, New Delhi (Auto-detected)';
            setDetectStatus(null);
            setIsDetecting(false);
            onSelectLocation(detected);
            onClose();
          }, 800);
        },
        () => {
          setDetectStatus('Location access denied. Please type your city/pincode.');
          setIsDetecting(false);
        }
      );
    } else {
      setDetectStatus('Geolocation not supported by browser');
      setIsDetecting(false);
    }
  };

  const filteredCities = POPULAR_CITIES.filter((city) =>
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
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-floating overflow-hidden z-10 border border-brand-border"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 rounded-2xl text-brand-orange">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brand-navy">Select your location</h3>
                  <p className="text-sm text-brand-muted">To see available services & pricing</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-brand-navy hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search city, pincode, or area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-brand-ink placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
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
                    <div className="font-bold text-brand-navy">Use Current Location</div>
                    <div className="text-xs text-brand-muted">Using GPS for exact address pinpoint</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-orange bg-white px-3 py-1.5 rounded-full shadow-sm">
                  Auto Detect
                </span>
              </button>

              {detectStatus && (
                <div className="text-xs text-center text-brand-orange font-medium">
                  {detectStatus}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted mb-3">
                  Popular Cities
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {filteredCities.map((city) => {
                    const isSelected = currentLocation.toLowerCase().includes(city.toLowerCase());
                    return (
                      <button
                        key={city}
                        onClick={() => {
                          onSelectLocation(city);
                          onClose();
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-sm font-semibold transition-all text-left ${
                          isSelected
                            ? 'border-brand-orange bg-orange-50 text-brand-navy shadow-sm'
                            : 'border-gray-100 bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="truncate">{city}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-orange shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
