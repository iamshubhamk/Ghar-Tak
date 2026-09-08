import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, X, Sparkles } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { Notification } from '../types/notification';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<Notification[]>('/notifications');
      setNotifications(response);
      const unread = response.filter((n) => !n.is_read).length;
      onUnreadCountChange?.(unread);
      setStatus('');
    } catch (error) {
      // Fallback empty list if offline/unauthenticated
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadNotifications();
    }
  }, [isOpen]);

  const markRead = async (notificationId: string) => {
    try {
      await apiRequest<Notification>(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      await loadNotifications();
    } catch (error) {
      setStatus('Could not update notification.');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-80 sm:w-96">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-floating border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-50 text-brand-orange rounded-xl">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-brand-navy">Notifications</h4>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} unread update(s)` : 'All caught up!'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-brand-navy hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {isLoading && (
                <div className="py-8 text-center text-xs font-semibold text-slate-400 animate-pulse">
                  Loading updates...
                </div>
              )}

              {!isLoading && notifications.length === 0 && (
                <div className="py-10 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No notifications yet</p>
                  <p className="text-[11px] text-slate-400">
                    Booking updates & partner alerts will appear here.
                  </p>
                </div>
              )}

              {notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    n.is_read
                      ? 'bg-white border-slate-100 text-slate-600'
                      : 'bg-orange-50/60 border-orange-200 text-brand-navy font-semibold'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-extrabold">{n.title}</div>
                    <div className="text-[11px] leading-snug text-slate-500">{n.message}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="p-1 text-brand-orange hover:bg-white rounded-lg transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {status && (
              <div className="p-2 text-center text-[10px] text-brand-orange font-bold border-t border-slate-100">
                {status}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

