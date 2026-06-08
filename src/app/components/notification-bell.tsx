import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Bell, X, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { useAppContext } from "../lib/context";
import { toast } from "sonner";
import type { NotificationResponse } from "../types/api";

export function NotificationBell() {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const loadNotifications = async () => {
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
        setNotifications(res.data);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await apiClient.markNotificationRead(notificationId);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
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
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 flex flex-col max-h-[600px] overflow-hidden max-w-[calc(100vw-2rem)]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
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
            ) : (
              <div className="space-y-1 p-2">
                {notifications.map((notification) => (
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
