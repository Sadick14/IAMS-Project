import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { useAppContext } from "../lib/context";
import { markNotificationRead as markStoreNotificationRead, setNotifications as setStoreNotifications } from "../lib/store";
import { toast } from "sonner";
import type { NotificationResponse } from "../types/api";

type NotificationFilter = "all" | "unread" | "read";
type DisplayNotification = NotificationResponse & {
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { user, store } = useAppContext();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;
  const visibleNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.read;
    if (filter === "read") return notification.read;
    return true;
  });

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (store.notifications.length === 0) return;
    setNotifications((prev) => {
      const actionDataById = new Map(prev.map((n) => [n.id, n]));
      return store.notifications.map((notification: any) => {
        const existing = actionDataById.get(String(notification.id));
        return {
          ...existing,
          id: String(notification.id),
          user_id: existing?.user_id ?? "",
          type: notification.type ?? existing?.type ?? "system",
          title: notification.title ?? existing?.title ?? "Notification",
          message: notification.message ?? existing?.message ?? "",
          read: Boolean(notification.read ?? notification.is_read),
          created_at: notification.created_at ?? notification.timestamp ?? existing?.created_at ?? new Date().toISOString(),
          action_url: existing?.action_url,
          priority: existing?.priority,
        } as DisplayNotification;
      });
    });
  }, [store.notifications]);

  const normaliseNotification = (notification: any): DisplayNotification => ({
    ...notification,
    id: String(notification.id),
    user_id: String(notification.user_id ?? ""),
    type: notification.type ?? "system",
    title: notification.title ?? notification.subject ?? "Notification",
    message: notification.message ?? notification.body ?? "",
    read: Boolean(notification.read ?? notification.is_read),
    created_at: notification.created_at ?? notification.timestamp ?? new Date().toISOString(),
  });

  const loadNotifications = async () => {
    setLoading(true);
    try {
      let res;

      // Fetch notifications based on user role
      if (user?.role === "supervisor") {
        res = await apiClient.getSupervisorNotifications({ limit: 20 });
      } else {
        // For other roles, try to fetch generic notifications
        res = await apiClient.getSupervisorNotifications({ limit: 20 });
      }

      if (res.success && Array.isArray(res.data)) {
        const normalised = res.data.map(normaliseNotification);
        setNotifications(normalised);
        setStoreNotifications(normalised.map((notification) => ({
          id: notification.id,
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
          read: notification.read,
          timestamp: notification.created_at,
        })));
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await apiClient.markNotificationRead(notificationId);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        markStoreNotificationRead(notificationId);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarking(true);
    try {
      const res = await apiClient.markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setStoreNotifications(store.notifications.map((n) => ({ ...n, read: true })));
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    } finally {
      setMarking(false);
    }
  };

  const handleNotificationClick = (notification: NotificationResponse) => {
    if (!notification.read) {
      // Update immediately to reduce count
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      markStoreNotificationRead(notification.id);
      // Mark as read on server
      handleMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · {notifications.length} total
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={marking}
                    className="p-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="Mark all as read"
                  >
                    {marking && <Loader2 className="w-3 h-3 animate-spin" />}
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { key: "all", label: "All", count: notifications.length },
                { key: "unread", label: "Unread", count: unreadCount },
                { key: "read", label: "Read", count: readCount },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key as NotificationFilter)}
                  className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                    filter === item.key
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span className="block text-[0.65rem] text-muted-foreground">{item.label}</span>
                  <span className="block text-sm font-semibold leading-tight">{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto opacity-50 mb-2" />
                <p>No notifications</p>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto opacity-50 mb-2" />
                <p>No {filter} notifications</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {visibleNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors border ${
                      notification.read
                        ? "bg-background border-border hover:bg-accent"
                        : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.priority && (
                          <span
                            className={`inline-block text-xs font-medium mt-1 px-2 py-0.5 rounded ${getPriorityColor(
                              notification.priority
                            )}`}
                          >
                            {notification.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-border text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/${user?.role}/communications?tab=notifications`);
                }}
                className="text-xs text-primary hover:underline font-medium cursor-pointer bg-transparent border-0 p-0"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
