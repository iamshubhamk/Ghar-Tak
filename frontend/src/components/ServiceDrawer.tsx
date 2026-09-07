import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Calendar,
  MapPin,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Tag,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ServiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  currentLocation: string;
  onConfirmBooking: (bookingDetails: any) => void;
  isSubmitting?: boolean;
}

const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM',
];

export const ServiceDrawer: React.FC<ServiceDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onClearCart,
  currentLocation,
  onConfirmBooking,
  isSubmitting = false,
}) => {
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [addressInput, setAddressInput] = useState(currentLocation || 'Connaught Place, New Delhi');

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const platformFee = subtotal > 0 ? 49 : 0;
  const taxes = Math.round(subtotal * 0.05);
  const discount = subtotal > 1000 ? 100 : 0;
  const grandTotal = Math.max(0, subtotal + platformFee + taxes - discount);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    onConfirmBooking({
      items: cartItems,
      date: selectedDate,
      timeSlot: selectedSlot,
      address: addressInput,
      paymentMethod,
      amount: grandTotal,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col justify-between"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-2xl text-brand-orange">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-brand-navy">Your Booking Cart</h3>
                  <p className="text-xs font-semibold text-slate-400">{cartItems.length} service(s) selected</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {cartItems.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-brand-navy text-base">Your cart is empty</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Explore categories and add top rated services to get started!
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Selected Services
                    </h4>
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-extrabold text-xs text-brand-navy">{item.name}</div>
                          <div className="text-xs font-black text-brand-orange mt-0.5">
                            ₹{item.price * item.quantity}
                          </div>
                        </div>

                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 font-extrabold text-xs text-brand-navy">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Select Date & Time Slot</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-2">
                      {['Today', 'Tomorrow', 'Day After'].map((d) => (
                        <button
                          key={d}
                          onClick={() => setSelectedDate(d)}
                          className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                            selectedDate === d
                              ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition-all text-center truncate ${
                            selectedSlot === slot
                              ? 'bg-orange-50 border-brand-orange text-brand-navy shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Service Location</span>
                    </h4>
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-brand-ink focus:outline-none focus:border-brand-orange"
                      placeholder="Enter flat / house no., street..."
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Payment Method</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethod('cod')}
                        className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between transition-all ${
                          paymentMethod === 'cod'
                            ? 'border-brand-orange bg-orange-50 text-brand-navy'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <span>Cash / Pay Later</span>
                        {paymentMethod === 'cod' && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
                      </button>
                      <button
                        onClick={() => setPaymentMethod('online')}
                        className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-between transition-all ${
                          paymentMethod === 'online'
                            ? 'border-brand-orange bg-orange-50 text-brand-navy'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <span>UPI / Card</span>
                        {paymentMethod === 'online' && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs font-semibold">
                    <div className="flex justify-between text-slate-600">
                      <span>Item Total</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Safety & Platform Fee</span>
                      <span>₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxes (GST 5%)</span>
                      <span>₹{taxes}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Special Promo Discount
                        </span>
                        <span>-₹{discount}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-brand-navy">
                      <span>Total Payable</span>
                      <span>₹{grandTotal}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-white space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>30-Day Money Back Guarantee</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between p-4 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-2xl font-extrabold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold text-orange-200 leading-none">Total Amount</div>
                    <div className="text-lg font-black leading-none mt-1">₹{grandTotal}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{isSubmitting ? 'Booking...' : 'Confirm & Book'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
