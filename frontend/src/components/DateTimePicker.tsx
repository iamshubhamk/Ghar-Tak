import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';

interface DateTimePickerProps {
  onChange: (isoString: string) => void;
  initialDate?: string;
}

const AVAILABLE_TIME_SLOTS = [
  { label: '09:00 AM - 10:00 AM', startHour: 9 },
  { label: '10:00 AM - 11:00 AM', startHour: 10 },
  { label: '11:00 AM - 12:00 PM', startHour: 11 },
  { label: '12:00 PM - 01:00 PM', startHour: 12 },
  { label: '02:00 PM - 03:00 PM', startHour: 14 },
  { label: '03:00 PM - 04:00 PM', startHour: 15 },
  { label: '04:00 PM - 05:00 PM', startHour: 16 },
  { label: '05:00 PM - 06:00 PM', startHour: 17 },
  { label: '06:00 PM - 07:00 PM', startHour: 18 },
  { label: '07:00 PM - 08:00 PM', startHour: 19 },
];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ onChange, initialDate }) => {
  const todayDateStr = new Date().toISOString().split('T')[0];
  const tomorrowDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfterStr = new Date(Date.now() + 172800000).toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedSlot, setSelectedSlot] = useState<string>(AVAILABLE_TIME_SLOTS[0].label);

  const currentHour = new Date().getHours();

  // Combine selected date and time slot into ISO String and fire onChange
  useEffect(() => {
    if (!selectedDate || !selectedSlot) return;

    const slotObj = AVAILABLE_TIME_SLOTS.find((s) => s.label === selectedSlot) || AVAILABLE_TIME_SLOTS[0];
    const d = new Date(selectedDate);
    d.setHours(slotObj.startHour, 0, 0, 0);

    onChange(d.toISOString());
  }, [selectedDate, selectedSlot]);

  return (
    <div className="space-y-4">
      {/* Date Picker Header & Quick Pills */}
      <div>
        <label className="text-xs font-extrabold text-brand-navy mb-2 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-brand-orange" />
          <span>Select Preferred Date</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Today', date: todayDateStr },
            { label: 'Tomorrow', date: tomorrowDateStr },
            { label: 'Day After', date: dayAfterStr },
          ].map((item) => {
            const isSelected = selectedDate === item.date;
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => setSelectedDate(item.date)}
                className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold border transition-all text-center ${
                  isSelected
                    ? 'bg-brand-navy text-white border-brand-navy shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Selection Input */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">Or choose specific date:</span>
          <input
            type="date"
            min={todayDateStr}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-navy focus:outline-none focus:border-brand-orange"
          />
        </div>
      </div>

      {/* Dynamic Time Slot Cards */}
      <div>
        <label className="text-xs font-extrabold text-brand-navy mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-orange" />
            <span>Select 1-Hour Time Slot</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Patna Technician Slots</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AVAILABLE_TIME_SLOTS.map((slot) => {
            const isToday = selectedDate === todayDateStr;
            const isPast = isToday && slot.startHour <= currentHour;
            const isSelected = selectedSlot === slot.label;

            return (
              <button
                type="button"
                key={slot.label}
                disabled={isPast}
                onClick={() => setSelectedSlot(slot.label)}
                className={`p-2.5 rounded-2xl text-[11px] font-extrabold border transition-all flex items-center justify-between text-left ${
                  isPast
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                    : isSelected
                    ? 'bg-orange-50 border-brand-orange text-brand-navy shadow-sm ring-2 ring-brand-orange/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{slot.label}</span>
                {isSelected && !isPast && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-orange shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

