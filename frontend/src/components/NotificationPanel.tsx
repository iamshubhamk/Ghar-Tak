import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../lib/api";
import { Notification } from "../types/notification";

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [status, setStatus] = useState("");

  const loadNotifications = async () => {
    try {
      const response = await apiRequest<Notification[]>("/notifications");
      setNotifications(response);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Notifications unavailable.");
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const markRead = async (notificationId: string) => {
    try {
      await apiRequest<Notification>(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        body: JSON.stringify({})
      });
      await loadNotifications();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update notification.");
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="operation-panel notification-panel">
      <h3>
        <Bell size={20} aria-hidden="true" />
        Notifications
      </h3>

      <p className="empty-state">
        {unreadCount > 0
          ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
          : "No unread updates."}
      </p>

      <div className="notification-list">
        {notifications.length === 0 ? <p className="muted-copy">No notifications yet.</p> : null}
        {notifications.slice(0, 5).map((notification) => (
          <article
            className={notification.is_read ? "notification-item" : "notification-item unread"}
            key={notification.id}
          >
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <small>{new Date(notification.created_at).toLocaleString()}</small>
            </div>
            {!notification.is_read ? (
              <button
                aria-label={`Mark ${notification.title} as read`}
                onClick={() => void markRead(notification.id)}
                type="button"
              >
                <CheckCheck size={18} aria-hidden="true" />
              </button>
            ) : null}
          </article>
        ))}
      </div>

      {status ? <p className="form-status">{status}</p> : null}
    </div>
  );
}

